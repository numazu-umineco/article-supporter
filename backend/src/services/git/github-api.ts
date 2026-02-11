import { Octokit } from '@octokit/rest'
import { env } from '../../config/env'
import { getAppOctokit } from '../github'

export interface PullRequestInfo {
  url: string
  number: number
  merged: boolean
}

export interface BotCommitter {
  name: string
  email: string
}

let cachedBotCommitter: BotCommitter | null = null

export async function getAppBotCommitter(): Promise<BotCommitter> {
  if (cachedBotCommitter) {
    return cachedBotCommitter
  }

  const octokit = getAppOctokit()

  // GET /app で App のslug を取得
  const { data: app } = await octokit.apps.getAuthenticated()
  if (!app?.slug) {
    throw new Error('GitHub App slug could not be retrieved')
  }
  const slug = app.slug

  // GET /users/{slug}[bot] で Bot の User ID を取得
  const publicOctokit = new Octokit()
  const { data: botUser } = await publicOctokit.users.getByUsername({
    username: `${slug}[bot]`,
  })

  cachedBotCommitter = {
    name: `${slug}[bot]`,
    email: `${botUser.id}+${slug}[bot]@users.noreply.github.com`,
  }

  return cachedBotCommitter
}

export async function createPullRequest(
  head: string,
  title: string,
  body?: string
): Promise<PullRequestInfo> {
  const octokit = getAppOctokit()

  const { data } = await octokit.pulls.create({
    owner: env.GITHUB_OWNER!,
    repo: env.GITHUB_REPO!,
    head,
    base: 'main',
    title,
    body,
  })

  return {
    url: data.html_url,
    number: data.number,
    merged: false,
  }
}

export async function getPullRequest(prNumber: number): Promise<PullRequestInfo> {
  const octokit = getAppOctokit()

  const { data } = await octokit.pulls.get({
    owner: env.GITHUB_OWNER!,
    repo: env.GITHUB_REPO!,
    pull_number: prNumber,
  })

  return {
    url: data.html_url,
    number: data.number,
    merged: data.merged,
  }
}
