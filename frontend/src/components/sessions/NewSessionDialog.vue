<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useSessions } from '@/composables/useSessions'
import { useEventTypes } from '@/composables/useEventTypes'
import { useApi } from '@/composables/useApi'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const visible = defineModel<boolean>('visible', { required: true })

const router = useRouter()
const toast = useToast()
const api = useApi()
const { createSession } = useSessions()
const { eventTypes, loading: loadingEventTypes, fetchEventTypes } = useEventTypes()

const eventDate = ref<Date | null>(null)
const selectedEventTypeId = ref<string | null>(null)
const customPrompt = ref('')
const creating = ref(false)

watch(visible, (val) => {
  if (val) {
    eventDate.value = null
    selectedEventTypeId.value = null
    customPrompt.value = ''
    fetchEventTypes(true)
  }
})

function formatDateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildInitialMessage(eventTypeName: string, eventDateStr: string): string {
  let message = `${eventDateStr}に開催された「${eventTypeName}」の開催報告記事を作成してください。`
  if (customPrompt.value) {
    message += `\n\n${customPrompt.value}`
  }
  return message
}

async function handleCreate() {
  if (!eventDate.value || !selectedEventTypeId.value) return

  creating.value = true
  try {
    // 1. Create session
    const session = await createSession({
      eventTypeId: selectedEventTypeId.value,
      eventDate: formatDateToString(eventDate.value),
    })

    // 2. Send initial message (fire and forget - don't await LLM response)
    const selectedEventType = eventTypes.value.find(et => et.id === selectedEventTypeId.value)
    const eventTypeName = selectedEventType?.name ?? 'イベント'
    const initialMessage = buildInitialMessage(eventTypeName, session.eventDate)

    api.post(`/api/sessions/${session.id}/messages`, {
      content: initialMessage,
      currentState: { title: null, slug: null, articleContent: null },
    })

    // 3. Close dialog and navigate immediately (LLM response will arrive in background)
    visible.value = false
    toast.add({
      severity: 'success',
      summary: '作成完了',
      detail: 'セッションを作成しました',
      life: 3000,
    })
    router.push(`/sessions/${session.id}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    header="新規セッション作成"
    :style="{ width: '28rem' }"
    modal
    :closable="!creating"
  >
    <div class="flex flex-column gap-4">
      <div class="flex flex-column gap-2">
        <label for="event-date" class="font-medium">イベント開催日 *</label>
        <DatePicker
          id="event-date"
          v-model="eventDate"
          date-format="yy-mm-dd"
          placeholder="日付を選択"
          show-icon
          :disabled="creating"
        />
      </div>

      <div class="flex flex-column gap-2">
        <label for="event-type" class="font-medium">イベント種類 *</label>
        <Select
          id="event-type"
          v-model="selectedEventTypeId"
          :options="eventTypes"
          option-label="name"
          option-value="id"
          placeholder="イベント種類を選択"
          :loading="loadingEventTypes"
          :disabled="creating"
        />
      </div>

      <div class="flex flex-column gap-2">
        <label for="custom-prompt" class="font-medium">カスタムプロンプト</label>
        <Textarea
          id="custom-prompt"
          v-model="customPrompt"
          rows="4"
          placeholder="LLMへの追加の指示があれば入力してください"
          auto-resize
          :disabled="creating"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="キャンセル"
        severity="secondary"
        text
        :disabled="creating"
        @click="visible = false"
      />
      <Button
        label="作成"
        icon="pi pi-plus"
        :loading="creating"
        :disabled="!eventDate || !selectedEventTypeId"
        @click="handleCreate"
      />
    </template>
  </Dialog>
</template>
