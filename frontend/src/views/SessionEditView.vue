<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useSessions } from '@/composables/useSessions'
import { useChat } from '@/composables/useChat'
import { useAutoSave } from '@/composables/useAutoSave'
import ProgressSpinner from 'primevue/progressspinner'
import SessionHeader from '@/components/session-edit/SessionHeader.vue'
import ChatPane from '@/components/session-edit/ChatPane.vue'
import EditorPane from '@/components/session-edit/EditorPane.vue'
import type { Session } from '@/types'

const route = useRoute()
const toast = useToast()
const sessionId = route.params.id as string
const { getSession, updateSession } = useSessions()
const { messages, loading: loadingMessages, sending, fetchMessages, sendMessage } = useChat(sessionId)

const session = ref<Session | null>(null)
const loadingSession = ref(true)

// Editor fields
const title = ref<string | null>(null)
const slug = ref<string | null>(null)
const articleContent = ref<string | null>(null)

const isMerged = computed(() => session.value?.status === 'merged')

let pollTimer: ReturnType<typeof setInterval> | null = null

// Auto-save
const { saving, saved, markDirty } = useAutoSave(async () => {
  if (!session.value) return
  await updateSession(session.value.id, {
    title: title.value,
    slug: slug.value,
    articleContent: articleContent.value,
  })
})

// Watch editor fields for auto-save
watch(title, () => { if (!loadingSession.value) markDirty() })
watch(slug, () => { if (!loadingSession.value) markDirty() })
watch(articleContent, () => { if (!loadingSession.value) markDirty() })

onMounted(async () => {
  try {
    session.value = await getSession(sessionId)
    title.value = session.value.title
    slug.value = session.value.slug
    articleContent.value = session.value.articleContent
    await fetchMessages()

    // If last message is from user (assistant reply pending), poll for response
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg && lastMsg.role === 'user') {
      sending.value = true
      pollTimer = setInterval(async () => {
        await fetchMessages()
        const latest = messages.value[messages.value.length - 1]
        if (latest && latest.role === 'assistant') {
          sending.value = false
          if (pollTimer) {
            clearInterval(pollTimer)
            pollTimer = null
          }
          // Update editor fields if article was extracted
          session.value = await getSession(sessionId)
          if (session.value.title) title.value = session.value.title
          if (session.value.slug) slug.value = session.value.slug
          if (session.value.articleContent) articleContent.value = session.value.articleContent
        }
      }, 2000)
    }
  } finally {
    loadingSession.value = false
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

async function handleSendMessage(content: string) {
  const result = await sendMessage(content, {
    title: title.value,
    slug: slug.value,
    articleContent: articleContent.value,
  })

  // If article was extracted, update editor fields
  if (result.article) {
    if (result.article.title !== undefined) title.value = result.article.title
    if (result.article.slug !== undefined) slug.value = result.article.slug
    if (result.article.content !== undefined) articleContent.value = result.article.content
    // Refresh session to get updated data
    session.value = await getSession(sessionId)
  }
}

function handlePublish() {
  toast.add({
    severity: 'info',
    summary: '未実装',
    detail: 'PR作成機能は Phase 7 で実装されます',
    life: 3000,
  })
}
</script>

<template>
  <div class="flex flex-column" style="height: 100vh">
    <div v-if="loadingSession" class="flex-1 flex align-items-center justify-content-center">
      <ProgressSpinner />
    </div>

    <template v-else-if="session">
      <!-- Header -->
      <SessionHeader
        :session="session"
        :saving="saving"
        :saved="saved"
        @publish="handlePublish"
      />

      <!-- 3-pane layout -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Left pane: Chat -->
        <div class="w-6 border-right-1 surface-border flex flex-column">
          <ChatPane
            :messages="messages"
            :loading="loadingMessages"
            :sending="sending"
            :disabled="isMerged"
            @send="handleSendMessage"
          />
        </div>

        <!-- Right pane: Editor -->
        <div class="w-6 flex flex-column">
          <EditorPane
            v-model:title="title"
            v-model:slug="slug"
            v-model:article-content="articleContent"
            :disabled="isMerged || sending"
          />
        </div>
      </div>
    </template>
  </div>
</template>
