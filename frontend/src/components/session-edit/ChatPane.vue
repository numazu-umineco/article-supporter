<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import Avatar from 'primevue/avatar'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import ChatMessageItem from './ChatMessage.vue'
import type { ChatMessage } from '@/types'

const props = defineProps<{
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const messageInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)

function handleSend() {
  const content = messageInput.value.trim()
  if (!content || props.sending) return

  emit('send', content)
  messageInput.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleSend()
  }
}

// Auto-scroll to bottom when messages change
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }
)
</script>

<template>
  <div class="flex flex-column h-full">
    <!-- Chat history -->
    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto p-3"
    >
      <div v-if="loading" class="flex justify-content-center py-3">
        <ProgressSpinner style="width: 2rem; height: 2rem" />
      </div>
      <template v-else>
        <div v-if="messages.length === 0" class="text-center text-600 py-5">
          <i class="pi pi-comments text-4xl mb-3 block" />
          <p>メッセージを送信して記事作成を開始しましょう。</p>
        </div>
        <ChatMessageItem
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />
        <div v-if="sending" class="flex justify-content-start mb-3">
          <Avatar
            label="S"
            class="mr-2" 
            shape="circle"
          />
          <div class="surface-100 border-round-lg px-3 py-2 typing-bubble">
            <span class="typing-dot" />
            <span class="typing-dot" />
            <span class="typing-dot" />
          </div>
        </div>
      </template>
    </div>

    <!-- Input area -->
    <div v-if="!disabled" class="p-3 border-top-1 surface-border">
      <div class="flex gap-2">
        <Textarea
          v-model="messageInput"
          placeholder="メッセージを入力... (Ctrl+Enter で送信)"
          :rows="1"
          auto-resize
          class="flex-1"
          @keydown="handleKeydown"
        />
        <Button
          icon="pi pi-send"
          :loading="sending"
          :disabled="!messageInput.trim()"
          @click="handleSend"
          class="align-self-end"
        />
      </div>
    </div>

    <!-- Merged notice -->
    <div v-else class="p-3 border-top-1 surface-border">
      <p class="text-center text-600 m-0">
        このセッションはマージ済みのため編集できません
      </p>
    </div>
  </div>
</template>

<style scoped>
.typing-bubble {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.typing-bubble {
  min-height: calc(1lh + 0.5rem * 2);
}

.typing-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: var(--p-text-muted-color);
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
