import { describe, it, expect, vi } from 'vitest'
import { formatEventDate, generateFrontmatter, getArticleDirPath, publishSession } from './publish-service'
import { ValidationError } from '../../middlewares/error-handler'

// Mock external dependencies
vi.mock('../storage/s3-service', () => ({
  downloadFile: vi.fn(),
}))
vi.mock('./git-service', () => ({
  cloneRepo: vi.fn().mockResolvedValue('mock-token'),
  createBranch: vi.fn(),
  checkoutBranch: vi.fn(),
  addFiles: vi.fn(),
  removeFiles: vi.fn(),
  hasStagedChanges: vi.fn().mockResolvedValue(true),
  commitChanges: vi.fn(),
  push: vi.fn(),
}))
vi.mock('./github-api', () => ({
  createPullRequest: vi.fn().mockResolvedValue({ url: 'https://github.com/test/pr/1', number: 1 }),
  getAppBotCommitter: vi.fn().mockResolvedValue({ name: 'bot', email: 'bot@test.com' }),
}))
vi.mock('../session', () => ({
  updateSessionPublishStatus: vi.fn(),
}))

describe('formatEventDate', () => {
  it('YYYY-MM-DD を 年月日 形式に変換する', () => {
    expect(formatEventDate('2025-01-15')).toBe('2025年1月15日')
  })

  it('月と日の先頭ゼロを除去する', () => {
    expect(formatEventDate('2025-03-05')).toBe('2025年3月5日')
  })

  it('12月31日のケース', () => {
    expect(formatEventDate('2024-12-31')).toBe('2024年12月31日')
  })
})

describe('generateFrontmatter', () => {
  it('eyecatchなしのフロントマターを生成する', () => {
    const result = generateFrontmatter('テスト記事', '2025-01-15', null)
    expect(result).toBe(
      '---\ntitle: "テスト記事"\ndate: 2025-01-15\n---'
    )
  })

  it('eyecatchありのフロントマターを生成する', () => {
    const result = generateFrontmatter('テスト記事', '2025-01-15', 'photo.jpg')
    expect(result).toBe(
      '---\ntitle: "テスト記事"\ndate: 2025-01-15\neyecatch: ./photo.jpg\n---'
    )
  })
})

describe('getArticleDirPath', () => {
  it('正しいディレクトリパスを生成する', () => {
    expect(getArticleDirPath('2025-01-15')).toBe('src/news/2025/0115')
  })

  it('月日が2桁の場合', () => {
    expect(getArticleDirPath('2025-12-31')).toBe('src/news/2025/1231')
  })
})

describe('publishSession - validation', () => {
  const mockUser = {
    id: 'user-1',
    githubId: 12345,
    githubLogin: 'testuser',
  }

  const baseSession = {
    id: 'session-1',
    eventDate: '2025-01-15',
    title: 'テスト記事',
    slug: 'test-article',
    articleContent: '# テスト\n\n本文です。',
    eyecatchImageId: null,
    status: 'draft' as const,
    branchName: null,
    eventType: { name: 'オープンカフェ' },
    images: [],
  }

  it('タイトルが空の場合にValidationErrorを投げる', async () => {
    await expect(
      publishSession({ ...baseSession, title: null }, mockUser)
    ).rejects.toThrow(ValidationError)

    await expect(
      publishSession({ ...baseSession, title: '  ' }, mockUser)
    ).rejects.toThrow('タイトルが入力されていません')
  })

  it('slugが空の場合にValidationErrorを投げる', async () => {
    await expect(
      publishSession({ ...baseSession, slug: null }, mockUser)
    ).rejects.toThrow(ValidationError)

    await expect(
      publishSession({ ...baseSession, slug: '' }, mockUser)
    ).rejects.toThrow('slugが入力されていません')
  })

  it('記事本文が空の場合にValidationErrorを投げる', async () => {
    await expect(
      publishSession({ ...baseSession, articleContent: null }, mockUser)
    ).rejects.toThrow(ValidationError)

    await expect(
      publishSession({ ...baseSession, articleContent: '   ' }, mockUser)
    ).rejects.toThrow('記事本文が入力されていません')
  })
})
