<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

const title = defineModel<string | null>('title')
const slug = defineModel<string | null>('slug')
const articleContent = defineModel<string | null>('articleContent')

defineProps<{
  disabled: boolean
}>()
</script>

<template>
  <div class="flex flex-column h-full p-3 gap-3 overflow-y-auto">
    <div class="flex flex-column gap-2">
      <label for="edit-title" class="font-medium text-sm">タイトル</label>
      <InputText
        id="edit-title"
        :model-value="title ?? ''"
        placeholder="記事タイトル"
        :disabled="disabled"
        @update:model-value="title = $event || null"
      />
    </div>

    <div class="flex flex-column gap-2">
      <label for="edit-slug" class="font-medium text-sm">slug</label>
      <InputText
        id="edit-slug"
        :model-value="slug ?? ''"
        placeholder="article-slug (英数字、ハイフン、アンダースコア)"
        :disabled="disabled"
        @update:model-value="slug = $event || null"
      />
    </div>

    <div class="flex flex-column gap-2 flex-1">
      <label for="edit-content" class="font-medium text-sm">記事本文 (Markdown)</label>
      <Textarea
        id="edit-content"
        :model-value="articleContent ?? ''"
        placeholder="Markdown形式で記事本文を入力..."
        :disabled="disabled"
        class="flex-1"
        :rows="20"
        auto-resize
        @update:model-value="articleContent = $event || null"
      />
    </div>
  </div>
</template>
