import { eq, asc } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { chatMessages, sessions } from '../../db/schema'
import { getChatCompletion, type ChatCompletionMessage } from './openai-client'
import { parseArticle } from './article-parser'
import { NotFoundError } from '../../middlewares/error-handler'

const BASE_SYSTEM_PROMPT = `あなたはイベント開催報告記事の作成をサポートするアシスタントです。

記事のコンテンツを提案する際は、必ず以下の形式で出力してください:

<article>
<title>記事のタイトル</title>
<slug>記事のslug（英数字とハイフン、アンダースコアのみ）</slug>
<content>
Markdown形式の記事本文
</content>
</article>

以下はタイトルとその公開URLの例です。このうち slug となるのは、URLのファイル名部分 (/news/YYYY/MMDD/{slug}.html) に相当します。

- うみねこ会 第23回 を開催しました
  - /news/2025/1220/umineco_23rd.html
- うみねこオープンカフェ 第7回 を開催しました
  - /news/2025/1220/umineco_open_cafe_7th.html
- うみねこ会 第22回 を開催しました
  - /news/2025/1115/umineco_22nd.html
- うみねこオープンカフェ 第6回 を開催しました
  - /news/2025/1115/umineco_open_cafe_6th.html
- SBSラジオ「ゴゴボラケ」に代表がゲスト出演しました
  - /news/2025/1112/sbs_radio.html
- 沼津地元愛物産展 2025で「NUMAZINE 沼津移住」を頒布しました
  - /news/2025/1101/jimoai_numazine.html
- うみねこ会 第21回 を開催しました
  - /news/2025/1018/umineco_21st.html
- うみねこオープンカフェ 第5回 を開催しました
  - /news/2025/1018/umineco_open_cafe_5th.html
- 『沼津地元愛物産展 2025』にうみねこがNewStand+と共同で出展します
  - /news/2025/1017/jimoai_bussanten_2025.html

上記の形式以外の通常の会話や質問への回答は、<article>タグを使わずに普通に返答してください。
ユーザーはチャット形式であなたに指示を与えています。 <article> タグの前にユーザーへの返事をするテキストを含めるようにしてください。`

export async function getMessages(sessionId: string) {
  const db = getDb()

  return db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  })
}

export async function sendMessage(
  sessionId: string,
  userMessage: string,
  currentState: {
    title?: string | null
    slug?: string | null
    articleContent?: string | null
  }
) {
  const db = getDb()

  // Get session with event type
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { eventType: true },
  })

  if (!session) {
    throw new NotFoundError('Session not found')
  }

  // Save user message
  const [savedUserMsg] = await db
    .insert(chatMessages)
    .values({
      sessionId,
      role: 'user',
      content: userMessage,
    })
    .returning()

  // Build system prompt
  const systemPrompt = session.eventType
    ? `${BASE_SYSTEM_PROMPT}\n\n${session.eventType.systemPrompt}`
    : BASE_SYSTEM_PROMPT

  // Build current article state context
  let stateContext = ''
  if (currentState.title || currentState.slug || currentState.articleContent) {
    stateContext = `\n\n【現在の記事状態】\nタイトル: ${currentState.title || '（未設定）'}\nslug: ${currentState.slug || '（未設定）'}\n本文:\n${currentState.articleContent || '（未入力）'}`
  }

  // Get chat history
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  })

  // Build messages for OpenAI
  const openaiMessages: ChatCompletionMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (const msg of history) {
    if (msg.id === savedUserMsg.id) {
      // Add state context to the latest user message
      openaiMessages.push({
        role: 'user',
        content: stateContext ? `${msg.content}${stateContext}` : msg.content,
      })
    } else {
      openaiMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }
  }

  // Call OpenAI
  const aiResponse = await getChatCompletion(openaiMessages, session.model)

  // Parse article from response
  const { article, displayText } = parseArticle(aiResponse)

  // Save assistant message
  const [savedAssistantMsg] = await db
    .insert(chatMessages)
    .values({
      sessionId,
      role: 'assistant',
      content: aiResponse,
      articleContent: article
        ? JSON.stringify(article)
        : null,
    })
    .returning()

  // Update session if article content was extracted
  if (article) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (article.title !== undefined) updateData.title = article.title
    if (article.slug !== undefined) updateData.slug = article.slug
    if (article.content !== undefined) updateData.articleContent = article.content

    await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, sessionId))
  }

  return {
    message: savedAssistantMsg,
    article,
    displayText,
  }
}
