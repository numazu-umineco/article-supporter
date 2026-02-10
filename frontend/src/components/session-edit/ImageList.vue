<script setup lang="ts">
import { ref } from 'vue'
import ProgressSpinner from 'primevue/progressspinner'
import ImageCard from './ImageCard.vue'
import type { SessionImage } from '@/types'

const props = defineProps<{
  images: SessionImage[]
  uploading: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  upload: [file: File]
  updateFilename: [imageId: string, oldFilename: string, newFilename: string]
  setEyecatch: [imageId: string]
  delete: [imageId: string]
  insertImage: [filename: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function triggerFileSelect() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('upload', file)
  }
  input.value = ''
}

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function isImageFile(file: File): boolean {
  return allowedTypes.includes(file.type)
}

function handleDragOver(event: DragEvent) {
  if (props.disabled || props.uploading) return
  event.preventDefault()
  dragging.value = true
}

function handleDragLeave() {
  dragging.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  if (props.disabled || props.uploading) return

  const files = event.dataTransfer?.files
  if (!files?.length) return

  for (const file of Array.from(files)) {
    if (isImageFile(file)) {
      emit('upload', file)
    }
  }
}

function handleEmptyClick() {
  if (props.disabled || props.uploading) return
  triggerFileSelect()
}
</script>

<template>
  <!-- Hidden file input -->
  <input
    ref="fileInput"
    type="file"
    accept="image/jpeg,image/png,image/gif,image/webp"
    style="display: none"
    @change="handleFileChange"
  />

  <!-- Drop zone (always active) -->
  <div
    class="border-round border-2 border-dashed transition-colors transition-duration-150"
    :class="dragging ? 'border-primary surface-ground' : 'border-transparent'"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Uploading indicator -->
    <div v-if="uploading" class="flex align-items-center justify-content-center p-3">
      <ProgressSpinner style="width: 24px; height: 24px" />
      <span class="ml-2 text-sm text-500">アップロード中...</span>
    </div>

    <!-- Has images: horizontal scroll with add button on the left -->
    <div v-if="images.length > 0" class="flex gap-2 overflow-x-auto pb-1">
      <!-- Add button card -->
      <div
        v-if="!disabled"
        class="add-card flex flex-column align-items-center justify-content-center surface-100 border-round flex-shrink-0 cursor-pointer hover:surface-200 transition-colors transition-duration-150"
        style="width: 160px"
        @click="triggerFileSelect"
      >
        <i class="pi pi-plus text-400" style="font-size: 1.5rem" />
        <span class="text-xs text-500 mt-2">画像を追加</span>
      </div>

      <ImageCard
        v-for="image in images"
        :key="image.id"
        :image="image"
        :disabled="disabled"
        @update-filename="(id, oldName, newName) => emit('updateFilename', id, oldName, newName)"
        @set-eyecatch="(id) => emit('setEyecatch', id)"
        @delete="(id) => emit('delete', id)"
        @insert-image="(filename) => emit('insertImage', filename)"
      />
    </div>

    <!-- Empty: clickable drop hint -->
    <div
      v-if="!uploading && images.length === 0"
      class="text-center p-3 surface-100 border-round cursor-pointer hover:surface-200 transition-colors transition-duration-150"
      @click="handleEmptyClick"
    >
      <i class="pi pi-image text-400 mb-2" style="font-size: 1.5rem" />
      <p class="text-sm text-500 m-0">画像がありません</p>
      <p v-if="!disabled" class="text-xs text-400 m-0 mt-1">クリックまたはドラッグ&ドロップで追加</p>
    </div>
  </div>
</template>

<style scoped>
.add-card {
  min-height: 100px;
}
</style>
