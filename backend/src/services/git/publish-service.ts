import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { ValidationError } from '../../middlewares/error-handler'
import { downloadFile } from '../storage/s3-service'
import { cloneRepo, createBranch, checkoutBranch, addFiles, removeFiles, hasStagedChanges, commitChanges, push } from './git-service'
import { createPullRequest, getAppBotCommitter } from './github-api'
import { updateSessionPublishStatus } from '../session'
import type { AuthUser } from '../../middlewares/auth'

interface SessionForPublish {
  id: string
  eventDate: string
  title: string | null
  slug: string | null
  articleContent: string | null
  eyecatchImageId: string | null
  status: string | null
  branchName: string | null
  images: {
    id: string
    customFilename: string
    s3Key: string
    isEyecatch: boolean | null
  }[]
}

function generateFrontmatter(
  title: string,
  eventDate: string,
  eyecatchFilename: string | null
): string {
  const lines = [
    '---',
    `title: "${title}"`,
    `date: ${eventDate}`,
  ]
  if (eyecatchFilename) {
    lines.push(`eyecatch: ./${eyecatchFilename}`)
  }
  lines.push('---')
  return lines.join('\n')
}

function getArticleDirPath(eventDate: string): string {
  // eventDate is YYYY-MM-DD
  const [year, month, day] = eventDate.split('-')
  return `src/news/${year}/${month}${day}`
}

function generateBranchName(): string {
  const now = new Date()
  const formatted = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `post-gen/${formatted}`
}

function listFilesInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return []
  return fs.readdirSync(dirPath).filter((f) => {
    return fs.statSync(path.join(dirPath, f)).isFile()
  })
}

export async function publishSession(
  session: SessionForPublish,
  user: AuthUser
): Promise<{ prUrl: string; prNumber: number; branchName: string }> {
  // Validate required fields
  if (!session.title?.trim()) {
    throw new ValidationError('タイトルが入力されていません')
  }
  if (!session.slug?.trim()) {
    throw new ValidationError('slugが入力されていません')
  }
  if (!session.articleContent?.trim()) {
    throw new ValidationError('記事本文が入力されていません')
  }

  const isUpdate = session.status === 'pr_created'

  // Find eyecatch image filename
  const eyecatchImage = session.images.find((img) => img.isEyecatch)
  const eyecatchFilename = eyecatchImage?.customFilename ?? null

  // Generate markdown content
  const frontmatter = generateFrontmatter(session.title, session.eventDate, eyecatchFilename)
  const markdownContent = `${frontmatter}\n\n${session.articleContent}\n`

  // Article directory path
  const articleDir = getArticleDirPath(session.eventDate)
  const markdownPath = `${articleDir}/${session.slug}.md`

  // Create temp directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'article-supporter-'))

  try {
    // Clone repository
    const token = await cloneRepo(tmpDir)

    let branchName: string

    if (isUpdate && session.branchName) {
      // Update existing PR: checkout existing branch
      branchName = session.branchName
      await checkoutBranch(tmpDir, branchName, token)
    } else {
      // New PR: create new branch
      branchName = generateBranchName()
      await createBranch(tmpDir, branchName)
    }

    // Create article directory
    const fullArticleDir = path.join(tmpDir, articleDir)
    fs.mkdirSync(fullArticleDir, { recursive: true })

    // Write markdown file
    fs.writeFileSync(path.join(tmpDir, markdownPath), markdownContent, 'utf-8')

    // Download and place images
    const currentImageFilenames = new Set<string>()
    const filesToAdd = [markdownPath]
    for (const image of session.images) {
      const imageBuffer = await downloadFile(image.s3Key)
      const imagePath = `${articleDir}/${image.customFilename}`
      fs.writeFileSync(path.join(tmpDir, imagePath), imageBuffer)
      filesToAdd.push(imagePath)
      currentImageFilenames.add(image.customFilename)
    }

    // On update: detect and remove files that no longer exist in the session
    const filesToRemove: string[] = []
    if (isUpdate) {
      const existingFiles = listFilesInDir(fullArticleDir)
      const markdownFilename = `${session.slug}.md`
      for (const filename of existingFiles) {
        if (filename === markdownFilename) continue
        if (!currentImageFilenames.has(filename)) {
          filesToRemove.push(`${articleDir}/${filename}`)
        }
      }
    }

    // Stage additions and removals
    await addFiles(tmpDir, filesToAdd)
    if (filesToRemove.length > 0) {
      await removeFiles(tmpDir, filesToRemove)
    }

    // Check if there are actual changes to commit
    const hasChanges = await hasStagedChanges(tmpDir)

    if (isUpdate && !hasChanges) {
      // No changes to commit - return existing PR info
      return {
        prUrl: '',
        prNumber: 0,
        branchName,
      }
    }

    // Commit
    const commitMessage = `${ isUpdate ? 'Update' : 'Create' }: ${session.title}`
    const botCommitter = await getAppBotCommitter()

    await commitChanges(
      tmpDir,
      commitMessage,
      {
        name: user.githubLogin,
        email: `${user.githubId}+${user.githubLogin}@users.noreply.github.com`,
      },
      botCommitter
    )

    // Push
    await push(tmpDir, branchName, token)

    if (isUpdate) {
      return {
        prUrl: '',
        prNumber: 0,
        branchName,
      }
    }

    // Create PR
    const pr = await createPullRequest(branchName, session.title)

    // Update session in DB
    await updateSessionPublishStatus(session.id, {
      status: 'pr_created',
      prUrl: pr.url,
      prNumber: pr.number,
      branchName,
    })

    return {
      prUrl: pr.url,
      prNumber: pr.number,
      branchName,
    }
  } finally {
    // Cleanup temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}
