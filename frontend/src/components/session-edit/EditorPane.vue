<script setup lang="ts">
import { ref, nextTick } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ImageList from './ImageList.vue'
import type { SessionImage } from '@/types'

const title = defineModel<string | null>('title')
const slug = defineModel<string | null>('slug')
const articleContent = defineModel<string | null>('articleContent')

const lastCursorPosition = ref<number | null>(null)

function getContentTextarea(): HTMLTextAreaElement | null {
  return document.getElementById('edit-content') as HTMLTextAreaElement | null
}

function handleContentBlur() {
  const el = getContentTextarea()
  if (el) {
    lastCursorPosition.value = el.selectionStart
  }
}

defineProps<{
  images: SessionImage[]
  uploading: boolean
  disabled: boolean
}>()

defineEmits<{
  uploadImage: [file: File]
  updateImageFilename: [imageId: string, oldFilename: string, newFilename: string]
  setEyecatch: [imageId: string]
  deleteImage: [imageId: string]
}>()

const imagesPanelOpen = ref(true)

function handleInsertImage(filename: string) {
  const tag = `![](${'./' + filename})`
  const current = articleContent.value ?? ''

  if (!current) {
    articleContent.value = tag
    return
  }

  const cursorPos = lastCursorPosition.value ?? current.length
  // Find the end of the current line
  const nextNewline = current.indexOf('\n', cursorPos)
  const insertPos = nextNewline === -1 ? current.length : nextNewline
  // Insert the tag one line after the cursor position
  const before = current.substring(0, insertPos)
  const after = current.substring(insertPos)
  articleContent.value = before + '\n' + tag + after

  const newCursorPos = insertPos + 1 + tag.length
  nextTick(() => {
    const el = getContentTextarea()
    if (el) {
      el.focus()
      el.selectionStart = newCursorPos
      el.selectionEnd = newCursorPos
    }
  })
}

function handleUpdateFilename(_imageId: string, oldFilename: string, newFilename: string) {
  // Replace references in article content
  if (articleContent.value) {
    const oldRef = './' + oldFilename
    const newRef = './' + newFilename
    articleContent.value = articleContent.value.replaceAll(oldRef, newRef)
  }
}
</script>

<template>
  <div class="editor-pane">
    <!-- Editor area -->
    <div class="editor-area">
      <div class="flex flex-column gap-2 flex-shrink-0">
        <label for="edit-title" class="font-medium text-sm">タイトル</label>
        <InputText
          id="edit-title"
          :model-value="title ?? ''"
          placeholder="記事タイトル"
          :disabled="disabled"
          @update:model-value="title = $event || null"
        />
      </div>

      <div class="flex flex-column gap-2 flex-shrink-0">
        <label for="edit-slug" class="font-medium text-sm">slug</label>
        <InputText
          id="edit-slug"
          :model-value="slug ?? ''"
          placeholder="article-slug (英数字、ハイフン、アンダースコア)"
          :disabled="disabled"
          @update:model-value="slug = $event || null"
        />
      </div>

      <div class="textarea-wrapper">
        <label for="edit-content" class="font-medium text-sm flex-shrink-0">記事本文 (Markdown)</label>
        <Textarea
          id="edit-content"
          :model-value="articleContent ?? ''"
          placeholder="Markdown形式で記事本文を入力..."
          :disabled="disabled"
          class="editor-textarea"
          @update:model-value="articleContent = $event || null"
          @blur="handleContentBlur"
        />
      </div>
    </div>

    <!-- Image area (collapsible, fixed at bottom) -->
    <div class="border-top-1 surface-border flex-shrink-0">
      <div
        class="flex align-items-center justify-content-between px-3 py-2 cursor-pointer"
        @click="imagesPanelOpen = !imagesPanelOpen"
      >
        <span class="font-medium text-sm">
          画像 ({{ images.length }})
        </span>
        <Button
          :icon="imagesPanelOpen ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
          text
          rounded
          size="small"
          @click.stop="imagesPanelOpen = !imagesPanelOpen"
        />
      </div>
      <div v-show="imagesPanelOpen" class="px-3 pb-3">
        <ImageList
          :images="images"
          :uploading="uploading"
          :disabled="disabled"
          @upload="$emit('uploadImage', $event)"
          @update-filename="(id, oldName, newName) => { handleUpdateFilename(id, oldName, newName); $emit('updateImageFilename', id, oldName, newName) }"
          @set-eyecatch="$emit('setEyecatch', $event)"
          @delete="$emit('deleteImage', $event)"
          @insert-image="handleInsertImage"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.editor-area {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  padding: 0.75rem;
  gap: 0.75rem;
}

.textarea-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 200px;
  gap: 0.5rem;
  overflow: hidden;
}

.editor-textarea {
  flex: 1 1 0;
  min-height: 0;
  resize: none;
}

:deep(.editor-textarea textarea) {
  height: 100% !important;
  resize: none;
}
</style>
