import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import * as fs from 'node:fs'
import { env } from '../../config/env'
import { getAppOctokit } from '../github'

async function getInstallationToken(): Promise<string> {
  const octokit = getAppOctokit()
  const auth = (await octokit.auth({ type: 'installation' })) as { token: string }
  return auth.token
}

function getRepoUrl(token: string): string {
  return `https://x-access-token:${token}@github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}.git`
}

export async function cloneRepo(dir: string, depth?: number): Promise<string> {
  const token = await getInstallationToken()
  const url = getRepoUrl(token)

  await git.clone({
    fs,
    http,
    dir,
    url,
    depth: depth ?? 1,
    singleBranch: true,
  })

  return token
}

export async function createBranch(dir: string, branchName: string): Promise<void> {
  await git.branch({
    fs,
    dir,
    ref: branchName,
  })
  await git.checkout({
    fs,
    dir,
    ref: branchName,
  })
}

export async function checkoutBranch(dir: string, branchName: string, token: string): Promise<void> {
  const url = getRepoUrl(token)

  // Fetch the remote branch
  await git.fetch({
    fs,
    http,
    dir,
    url,
    ref: branchName,
    singleBranch: true,
  })

  // Create local branch tracking the remote
  await git.checkout({
    fs,
    dir,
    ref: branchName,
    remote: 'origin',
  })
}

export async function addFiles(dir: string, filepaths: string[]): Promise<void> {
  for (const filepath of filepaths) {
    await git.add({
      fs,
      dir,
      filepath,
    })
  }
}

export async function removeFiles(dir: string, filepaths: string[]): Promise<void> {
  for (const filepath of filepaths) {
    await git.remove({
      fs,
      dir,
      filepath,
    })
    // Also delete the file from the working directory
    const fullPath = `${dir}/${filepath}`
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
  }
}

export async function hasStagedChanges(dir: string): Promise<boolean> {
  const matrix = await git.statusMatrix({ fs, dir })
  // statusMatrix returns [filepath, HEAD, WORKDIR, STAGE]
  // No changes: HEAD === STAGE for all files (both are 1)
  return matrix.some(([_filepath, head, _workdir, stage]) => head !== stage)
}

export async function commitChanges(
  dir: string,
  message: string,
  author: { name: string; email: string },
  committer: { name: string; email: string }
): Promise<string> {
  const sha = await git.commit({
    fs,
    dir,
    message,
    author,
    committer,
  })
  return sha
}

export async function push(dir: string, branchName: string, token: string): Promise<void> {
  const url = getRepoUrl(token)

  await git.push({
    fs,
    http,
    dir,
    url,
    ref: branchName,
    remoteRef: `refs/heads/${branchName}`,
  })
}
