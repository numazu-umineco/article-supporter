<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useSessions } from '@/composables/useSessions'
import { useChat } from '@/composables/useChat'
import { useAutoSave } from '@/composables/useAutoSave'
import { useImages } from '@/composables/useImages'
import ProgressSpinner from 'primevue/progressspinner'
import SessionHeader from '@/components/session-edit/SessionHeader.vue'
import ChatPane from '@/components/session-edit/ChatPane.vue'
import EditorPane from '@/components/session-edit/EditorPane.vue'
import type { Session } from '@/types'

const route = useRoute()
const toast = useToast()
const sessionId = route.params.id as string
const { getSession, updateSession, publishSession } = useSessions()
const { messages, loading: loadingMessages, sending, fetchMessages, sendMessage } = useChat(sessionId)
const { images, uploading, setImages, uploadImage, updateImage, deleteImage } = useImages(sessionId)

const session = ref<Session | null>(null)
const loadingSession = ref(true)

// Editor fields
const title = ref<string | null>(null)
const slug = ref<string | null>(null)
const articleContent = ref<string | null>(null)

const isMerged = computed(() => session.value?.status === 'merged')
const publishing = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

// Auto-save
const { saving, saved, markDirty, save: flushSave } = useAutoSave(async () => {
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
    if (session.value.images) {
      setImages(session.value.images)
    }
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

async function handleUploadImage(file: File) {
  await uploadImage(file)
  toast.add({
    severity: 'success',
    summary: 'アップロード完了',
    detail: `${file.name} をアップロードしました`,
    life: 3000,
  })
}

async function handleUpdateImageFilename(imageId: string, _oldFilename: string, newFilename: string) {
  await updateImage(imageId, { customFilename: newFilename })
}

async function handleSetEyecatch(imageId: string) {
  await updateImage(imageId, { isEyecatch: true })
  // Refresh session to get updated eyecatchImageId
  session.value = await getSession(sessionId)
}

async function handleDeleteImage(imageId: string) {
  await deleteImage(imageId)
  // Refresh session in case eyecatch was cleared
  session.value = await getSession(sessionId)
  if (session.value.images) {
    setImages(session.value.images)
  }
}

async function handlePublish() {
  if (!title.value?.trim()) {
    toast.add({ severity: 'warn', summary: 'バリデーションエラー', detail: 'タイトルを入力してください', life: 3000 })
    return
  }
  if (!slug.value?.trim()) {
    toast.add({ severity: 'warn', summary: 'バリデーションエラー', detail: 'slugを入力してください', life: 3000 })
    return
  }
  if (!articleContent.value?.trim()) {
    toast.add({ severity: 'warn', summary: 'バリデーションエラー', detail: '記事本文を入力してください', life: 3000 })
    return
  }

  publishing.value = true
  try {
    // Flush any pending auto-save first
    await flushSave()

    const updated = await publishSession(sessionId)
    session.value = updated

    const isUpdate = updated.status === 'pr_created' && session.value?.prUrl
    toast.add({
      severity: 'success',
      summary: isUpdate ? 'PR更新完了' : 'PR作成完了',
      detail: isUpdate ? 'PRを更新しました' : `PR #${updated.prNumber} を作成しました`,
      life: 5000,
    })
  } finally {
    publishing.value = false
  }
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
        :publishing="publishing"
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
            :images="images"
            :uploading="uploading"
            :disabled="isMerged || sending"
            @upload-image="handleUploadImage"
            @update-image-filename="handleUpdateImageFilename"
            @set-eyecatch="handleSetEyecatch"
            @delete-image="handleDeleteImage"
          />
        </div>
      </div>
    </template>
  </div>
</template>
