import { ref } from 'vue'
import { useApi } from './useApi'
import type { ChatMessage } from '@/types'

interface ParsedArticle {
  title?: string
  slug?: string
  content?: string
}

interface SendMessageResponse {
  message: ChatMessage
  article: ParsedArticle | null
  displayText: string
}

export function useChat(sessionId: string) {
  const api = useApi()
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)

  async function fetchMessages() {
    loading.value = true
    try {
      messages.value = await api.get<ChatMessage[]>(
        `/api/sessions/${sessionId}/messages`
      )
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(
    content: string,
    currentState: {
      title?: string | null
      slug?: string | null
      articleContent?: string | null
    }
  ): Promise<SendMessageResponse> {
    // Optimistically add user message to the list immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId,
      role: 'user',
      content,
      articleContent: null,
      createdAt: new Date().toISOString(),
    }
    messages.value = [...messages.value, tempUserMsg]

    sending.value = true
    try {
      const result = await api.post<SendMessageResponse>(
        `/api/sessions/${sessionId}/messages`,
        { content, currentState }
      )

      // Refresh messages to get actual saved messages from DB
      await fetchMessages()

      return result
    } finally {
      sending.value = false
    }
  }

  return {
    messages,
    loading,
    sending,
    fetchMessages,
    sendMessage,
  }
}

/**
 * Remove <article>...</article> block from text for display in chat.
 */
export function stripArticleFromDisplay(text: string): string {
  return text.replace(/<article>[\s\S]*?<\/article>/, '').trim()
}
