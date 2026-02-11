<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'
import type { SessionImage } from '@/types'

const props = defineProps<{
  image: SessionImage
  disabled: boolean
}>()

const emit = defineEmits<{
  updateFilename: [imageId: string, oldFilename: string, newFilename: string]
  setEyecatch: [imageId: string]
  delete: [imageId: string]
  insertImage: [filename: string]
}>()

const editingFilename = ref(props.image.customFilename)

const imageUrl = computed(
  () => `/api/sessions/${props.image.sessionId}/images/${props.image.id}/file`
)

watch(
  () => props.image.customFilename,
  (val) => {
    editingFilename.value = val
  }
)

function handleFilenameBlur() {
  const trimmed = editingFilename.value.trim()
  if (trimmed && trimmed !== props.image.customFilename) {
    emit('updateFilename', props.image.id, props.image.customFilename, trimmed)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="image-card surface-100 border-round p-2 flex-shrink-0" style="width: 160px">
    <!-- Thumbnail with overlay -->
    <div
      class="thumbnail-container relative cursor-pointer border-round overflow-hidden"
      @click="emit('insertImage', image.customFilename)"
    >
      <img
        :src="imageUrl"
        :alt="image.customFilename"
        class="w-full block"
        style="height: 100px; object-fit: cover"
      />
      <!-- File size overlay (bottom-left) -->
      <span class="file-size-overlay">{{ formatFileSize(image.fileSize) }}</span>
      <!-- Delete button (top-right) -->
      <button
        v-if="!disabled"
        class="delete-overlay"
        @click.stop="emit('delete', image.id)"
      >
        <i class="pi pi-times" style="font-size: 0.7rem" />
      </button>
    </div>

    <!-- Info -->
    <div class="flex flex-column gap-1 mt-2">
      <InputText
        v-model="editingFilename"
        size="small"
        :disabled="disabled"
        class="w-full text-xs"
        @blur="handleFilenameBlur"
        @keydown.enter="handleFilenameBlur"
      />
      <div class="flex align-items-center gap-1">
        <RadioButton
          :model-value="image.isEyecatch"
          :value="true"
          :disabled="disabled"
          @update:model-value="emit('setEyecatch', image.id)"
        />
        <label class="text-xs">eyecatch</label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thumbnail-container:hover .delete-overlay {
  opacity: 1;
}

.file-size-overlay {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 3px;
  line-height: 1.3;
}

.delete-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.delete-overlay:hover {
  background: rgba(220, 53, 69, 0.8);
}
</style>
