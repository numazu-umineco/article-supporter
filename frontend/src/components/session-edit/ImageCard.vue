<script setup lang="ts">
import { ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'
import Button from 'primevue/button'
import type { SessionImage } from '@/types'

const props = defineProps<{
  image: SessionImage
  disabled: boolean
}>()

const emit = defineEmits<{
  updateFilename: [imageId: string, customFilename: string]
  setEyecatch: [imageId: string]
  delete: [imageId: string]
}>()

const editingFilename = ref(props.image.customFilename)

watch(
  () => props.image.customFilename,
  (val) => {
    editingFilename.value = val
  }
)

function handleFilenameBlur() {
  const trimmed = editingFilename.value.trim()
  if (trimmed && trimmed !== props.image.customFilename) {
    emit('updateFilename', props.image.id, trimmed)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-column surface-100 border-round p-2 flex-shrink-0" style="width: 160px">
    <!-- Thumbnail -->
    <img
      :src="image.s3Url"
      :alt="image.customFilename"
      class="border-round w-full"
      style="height: 100px; object-fit: cover"
    />

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
      <span class="text-xs text-500">{{ formatFileSize(image.fileSize) }}</span>
      <div class="flex align-items-center justify-content-between">
        <div class="flex align-items-center gap-1">
          <RadioButton
            :model-value="image.isEyecatch"
            :value="true"
            :disabled="disabled"
            @update:model-value="emit('setEyecatch', image.id)"
          />
          <label class="text-xs">eyecatch</label>
        </div>
        <Button
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          size="small"
          :disabled="disabled"
          @click="emit('delete', image.id)"
        />
      </div>
    </div>
  </div>
</template>
