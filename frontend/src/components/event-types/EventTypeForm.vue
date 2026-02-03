<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'
import type { EventType } from '@/types'

const props = defineProps<{
  visible: boolean
  eventType: EventType | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: {
    name: string
    description: string | null
    systemPrompt: string
    isActive: boolean
  }]
}>()

const name = ref('')
const description = ref('')
const systemPrompt = ref('')
const isActive = ref(true)
const saving = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (visible && props.eventType) {
      name.value = props.eventType.name
      description.value = props.eventType.description ?? ''
      systemPrompt.value = props.eventType.systemPrompt
      isActive.value = props.eventType.isActive
    } else if (visible) {
      name.value = ''
      description.value = ''
      systemPrompt.value = ''
      isActive.value = true
    }
  }
)

const isEdit = () => props.eventType !== null

async function handleSave() {
  saving.value = true
  try {
    emit('save', {
      name: name.value,
      description: description.value || null,
      systemPrompt: systemPrompt.value,
      isActive: isActive.value,
    })
  } finally {
    saving.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="isEdit() ? 'イベント種類を編集' : 'イベント種類を作成'"
    :modal="true"
    :closable="true"
    :style="{ width: '600px' }"
    @update:visible="handleClose"
  >
    <div class="flex flex-column gap-3">
      <div class="flex flex-column gap-2">
        <label for="et-name" class="font-medium">名前 *</label>
        <InputText
          id="et-name"
          v-model="name"
          placeholder="イベント種類の名前"
        />
      </div>

      <div class="flex flex-column gap-2">
        <label for="et-description" class="font-medium">説明</label>
        <Textarea
          id="et-description"
          v-model="description"
          placeholder="イベント種類の説明"
          :rows="3"
          auto-resize
        />
      </div>

      <div class="flex flex-column gap-2">
        <label for="et-prompt" class="font-medium">システムプロンプト *</label>
        <Textarea
          id="et-prompt"
          v-model="systemPrompt"
          placeholder="LLM に送信するシステムプロンプト"
          :rows="10"
          auto-resize
        />
      </div>

    </div>

    <template #footer>
      <div class="flex align-items-center justify-content-between w-full mt-4">
        <div class="flex align-items-center gap-2">
          <InputSwitch v-model="isActive" input-id="et-active" />
          <label for="et-active" class="font-medium">有効</label>
        </div>
        <div class="flex gap-2">
          <Button
            label="キャンセル"
            severity="secondary"
            text
            @click="handleClose"
          />
          <Button
            :label="isEdit() ? '更新' : '作成'"
            :loading="saving"
            :disabled="!name || !systemPrompt"
            @click="handleSave"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>
