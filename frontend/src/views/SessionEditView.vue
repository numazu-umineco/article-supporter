<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useSessions } from '@/composables/useSessions'
import { useChat } from '@/composables/useChat'
import { useAutoSave } from '@/composables/useAutoSave'
import { useImages } from '@/composables/useImages'
import { useApi } from '@/composables/useApi'
import { useMediaQuery } from '@/composables/useMediaQuery'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import SessionHeader from '@/components/session-edit/SessionHeader.vue'
import ChatPane from '@/components/session-edit/ChatPane.vue'
import EditorPane from '@/components/session-edit/EditorPane.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import type { Session } from '@/types'

const route = useRoute()
const toast = useToast()
const sessionId = route.params.id as string
const { getSession, updateSession, publishSession } = useSessions()
const { messages, loading: loadingMessages, sending, fetchMessages, sendMessage } = useChat(sessionId)
const { images, uploading, setImages, uploadImage, updateImage, deleteImage } = useImages(sessionId)
const { get: apiGet } = useApi()

const session = ref<Session | null>(null)
const loadingSession = ref(true)

// Editor fields
const title = ref<string | null>(null)
const slug = ref<string | null>(null)
const articleContent = ref<string | null>(null)

const isMerged = computed(() => session.value?.status === 'merged')
const publishing = ref(false)
const targetSiteBaseUrl = ref<string | undefined>()
const leftPaneTab = ref<'chat' | 'preview'>('chat')

// Responsive layout
const isDesktop = useMediaQuery('(min-width: 992px)')
const mobileOverlayOpen = ref(false)
const showEditorButton = ref(false)

function openMobileOverlay(tab: 'chat' | 'preview') {
  leftPaneTab.value = tab
  mobileOverlayOpen.value = true
}

function closeMobileOverlay() {
  mobileOverlayOpen.value = false
}

// Close overlay when switching to desktop
watch(isDesktop, (desktop) => {
  if (desktop) {
    mobileOverlayOpen.value = false
  }
})

function resolveImageSrc(src: string): string {
  if (!src.startsWith('./')) return src
  const filename = src.slice(2)
  const image = images.value.find(img => img.customFilename === filename)
  if (image) {
    return `/api/sessions/${image.sessionId}/images/${image.id}/file`
  }
  return src
}
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
        await fetchMessages({ silent: true })
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
          if (session.value.articleContent) {
            articleContent.value = session.value.articleContent
            showEditorButton.value = true
          }
        }
      }, 2000)
    }
  } finally {
    loadingSession.value = false
  }

  // Open chat overlay on mobile
  if (!isDesktop.value) {
    mobileOverlayOpen.value = true
    leftPaneTab.value = 'chat'
  }

  // Fetch config (non-critical, ignore errors)
  try {
    const config = await apiGet<{ targetSiteBaseUrl: string | null }>('/api/config')
    targetSiteBaseUrl.value = config.targetSiteBaseUrl ?? undefined
  } catch {
    // ignore
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

async function handleSendMessage(content: string) {
  showEditorButton.value = false

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
    showEditorButton.value = true
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
        :compact="!isDesktop"
        @publish="handlePublish"
      />

      <!-- Main content area -->
      <div class="flex flex-1 overflow-hidden relative">

        <!-- ===== Desktop: side-by-side ===== -->
        <template v-if="isDesktop">
          <!-- Left pane: Chat / Preview tabs -->
          <div class="w-6 border-right-1 surface-border flex flex-column">
            <Tabs v-model:value="leftPaneTab" class="left-pane-tabs" :dt="{ tablist: { background: 'transparent' }, tabpanel: { padding: '0' } }">
              <TabList>
                <Tab value="chat" class="flex align-items-center gap-2"><i class="pi pi-comments" />チャット</Tab>
                <Tab value="preview" class="flex align-items-center gap-2"><i class="pi pi-eye" />プレビュー</Tab>
              </TabList>
              <TabPanels class="left-pane-panels">
                <TabPanel value="chat" class="left-pane-panel">
                  <ChatPane
                    :messages="messages"
                    :loading="loadingMessages"
                    :sending="sending"
                    :disabled="isMerged"
                    @send="handleSendMessage"
                  />
                </TabPanel>
                <TabPanel value="preview" class="left-pane-panel">
                  <MarkdownPreview
                    :content="articleContent ?? ''"
                    :base-url="targetSiteBaseUrl"
                    :image-resolver="resolveImageSrc"
                    class="preview-area"
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
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
              :event-date="session.eventDate"
              @upload-image="handleUploadImage"
              @update-image-filename="handleUpdateImageFilename"
              @set-eyecatch="handleSetEyecatch"
              @delete-image="handleDeleteImage"
            />
          </div>
        </template>

        <!-- ===== Mobile: full-width editor + icon sidebar + overlay ===== -->
        <template v-else>
          <!-- Icon sidebar -->
          <div class="mobile-sidebar surface-card border-right-1 surface-border flex flex-column align-items-center py-2 gap-2">
            <Button
              icon="pi pi-comments"
              :severity="mobileOverlayOpen && leftPaneTab === 'chat' ? 'primary' : 'secondary'"
              text
              rounded
              v-tooltip.right="'チャット'"
              @click="openMobileOverlay('chat')"
            />
            <Button
              icon="pi pi-eye"
              :severity="mobileOverlayOpen && leftPaneTab === 'preview' ? 'primary' : 'secondary'"
              text
              rounded
              v-tooltip.right="'プレビュー'"
              @click="openMobileOverlay('preview')"
            />
          </div>

          <!-- Editor + Overlay container -->
          <div class="mobile-content-area">
            <EditorPane
              v-model:title="title"
              v-model:slug="slug"
              v-model:article-content="articleContent"
              :images="images"
              :uploading="uploading"
              :disabled="isMerged || sending"
              :event-date="session.eventDate"
              @upload-image="handleUploadImage"
              @update-image-filename="handleUpdateImageFilename"
              @set-eyecatch="handleSetEyecatch"
              @delete-image="handleDeleteImage"
            />

            <!-- Overlay: Chat / Preview -->
            <Transition name="mobile-overlay">
              <div
                v-if="mobileOverlayOpen"
                class="mobile-overlay surface-card flex flex-column"
              >
                <!-- Tab bar + close button -->
                <div class="mobile-overlay-header border-bottom-1 surface-border">
                  <Tabs v-model:value="leftPaneTab" :dt="{ tablist: { background: 'transparent' }, tabpanel: { padding: '0' } }">
                    <TabList>
                      <Tab value="chat" class="flex align-items-center gap-2"><i class="pi pi-comments" />チャット</Tab>
                      <Tab value="preview" class="flex align-items-center gap-2"><i class="pi pi-eye" />プレビュー</Tab>
                    </TabList>
                  </Tabs>
                  <Button
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    rounded
                    class="mobile-overlay-close"
                    @click="closeMobileOverlay"
                  />
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-hidden">
                  <ChatPane
                    v-if="leftPaneTab === 'chat'"
                    :messages="messages"
                    :loading="loadingMessages"
                    :sending="sending"
                    :disabled="isMerged"
                    :show-editor-button="showEditorButton"
                    @send="handleSendMessage"
                    @show-editor="closeMobileOverlay"
                  />
                  <MarkdownPreview
                    v-else
                    :content="articleContent ?? ''"
                    :base-url="targetSiteBaseUrl"
                    :image-resolver="resolveImageSrc"
                    class="preview-area"
                  />
                </div>
              </div>
            </Transition>
          </div>
        </template>

      </div>
    </template>
  </div>
</template>

<style scoped>
.left-pane-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.left-pane-panels {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

:deep(.left-pane-panels .p-tabpanels) {
  height: 100%;
}

.left-pane-panel {
  height: 100%;
  overflow: hidden;
}

:deep(.left-pane-panel) {
  height: 100%;
}

.preview-area {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

/* Mobile icon sidebar */
.mobile-sidebar {
  width: 48px;
  flex-shrink: 0;
}

/* Mobile editor + overlay container */
.mobile-content-area {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Mobile overlay */
.mobile-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.mobile-overlay-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.mobile-overlay-header :deep(.p-tabs) {
  flex: 1;
}

.mobile-overlay-close {
  flex-shrink: 0;
  margin-right: 0.5rem;
}

/* Overlay slide-in transition */
.mobile-overlay-enter-active {
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.mobile-overlay-leave-active {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}

.mobile-overlay-enter-from,
.mobile-overlay-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
