<script setup lang="ts">
import { computed } from 'vue'
import { stripArticleFromDisplay } from '@/composables/useChat'
import Avatar from 'primevue/avatar'
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
    class="flex mb-3 align-items-start"
    :class="isUser ? 'justify-content-end' : 'justify-content-start'"
  >
    <Avatar
      v-if="!isUser"
      label="S"
      class="mr-2 flex-shrink-0"
      shape="circle"
    />
    <div
      class="border-round-lg px-3 py-2 max-w-30rem"
      :class="isUser ? 'surface-200' : 'surface-100 text-color'"
      style="white-space: pre-wrap"
    >
      {{ displayContent }}
    </div>
  </div>
</template>
