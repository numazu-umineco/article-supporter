import { readFileSync } from 'node:fs'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { env } from '../config/env'

let cachedPrivateKey: string | null = null

function getPrivateKey(): string {
  if (cachedPrivateKey) {
    return cachedPrivateKey
  }
  cachedPrivateKey = readFileSync(env.GITHUB_APP_PRIVATE_KEY_PATH!, 'utf-8')
  return cachedPrivateKey
}

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = (await response.json()) as { access_token?: string; error?: string }

  if (data.error || !data.access_token) {
    throw new Error(data.error || 'No access token received')
  }

  return data.access_token
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const octokit = new Octokit({ auth: accessToken })

  const { data } = await octokit.users.getAuthenticated()

  return {
    id: data.id,
    login: data.login,
    name: data.name,
    email: data.email,
    avatar_url: data.avatar_url,
  }
}

export async function checkOrgMembership(
  accessToken: string,
  username: string
): Promise<boolean> {
  const octokit = new Octokit({ auth: accessToken })

  try {
    await octokit.orgs.checkMembershipForUser({
      org: env.GITHUB_ORG!,
      username,
    })
    return true
  } catch (error) {
    return false
  }
}

export async function checkRepoWriteAccess(
  accessToken: string,
  username: string
): Promise<boolean> {
  const octokit = new Octokit({ auth: accessToken })

  try {
    const { data } = await octokit.repos.getCollaboratorPermissionLevel({
      owner: env.GITHUB_OWNER!,
      repo: env.GITHUB_REPO!,
      username,
    })

    return data.permission === 'write' || data.permission === 'admin'
  } catch (error) {
    return false
  }
}

export function getAppOctokit(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID!,
      privateKey: getPrivateKey(),
      installationId: env.GITHUB_APP_INSTALLATION_ID!,
    },
  })
}

export function getOAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'read:user read:org',
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}
