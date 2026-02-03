export interface ParsedArticle {
  title?: string
  slug?: string
  content?: string
}

/**
 * Extract <article> tag content from LLM response.
 * Returns parsed fields and the response with <article> block removed.
 */
export function parseArticle(text: string): {
  article: ParsedArticle | null
  displayText: string
} {
  const articleRegex = /<article>([\s\S]*?)<\/article>/
  const match = text.match(articleRegex)

  if (!match) {
    return { article: null, displayText: text }
  }

  const articleBlock = match[1]
  const article: ParsedArticle = {}

  const titleMatch = articleBlock.match(/<title>([\s\S]*?)<\/title>/)
  if (titleMatch) {
    article.title = titleMatch[1].trim()
  }

  const slugMatch = articleBlock.match(/<slug>([\s\S]*?)<\/slug>/)
  if (slugMatch) {
    article.slug = slugMatch[1].trim()
  }

  const contentMatch = articleBlock.match(/<content>([\s\S]*?)<\/content>/)
  if (contentMatch) {
    article.content = contentMatch[1].trim()
  }

  // Remove <article>...</article> block from display text
  const displayText = text.replace(articleRegex, '').trim()

  return { article, displayText }
}

/**
 * Remove <article> block from text for display purposes.
 */
export function stripArticle(text: string): string {
  return text.replace(/<article>[\s\S]*?<\/article>/, '').trim()
}
