<script setup lang="ts">
import { computed } from 'vue'
import { stripArticleFromDisplay } from '@/composables/useChat'
import type { ChatMessage } from '@/types'

const props = defineProps<{
  message: ChatMessage
}>()

const isUser = computed(() => props.message.role === 'user')

const displayContent = computed(() => {
  if (isUser.value) {
    return props.message.content
  }
  // Strip <article> block from assistant messages for display
  return stripArticleFromDisplay(props.message.content)
})
</script>

<template>
  <div
    class="flex mb-3"
    :class="isUser ? 'justify-content-end' : 'justify-content-start'"
  >
    <div
      class="border-round-lg px-3 py-2 max-w-30rem white-space-pre-wrap"
      :class="isUser ? 'bg-primary' : 'surface-100 text-color'"
    >
      {{ displayContent }}
    </div>
  </div>
</template>
