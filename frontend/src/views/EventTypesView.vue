<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventTypes } from '@/composables/useEventTypes'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import AppHeader from '@/components/AppHeader.vue'
import EventTypeForm from '@/components/event-types/EventTypeForm.vue'
import type { EventType } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const { eventTypes, loading, fetchEventTypes, createEventType, updateEventType, deleteEventType } =
  useEventTypes()

const formVisible = ref(false)
const editingEventType = ref<EventType | null>(null)

onMounted(() => {
  fetchEventTypes()
})

function handleCreate() {
  editingEventType.value = null
  formVisible.value = true
}

function handleEdit(eventType: EventType) {
  editingEventType.value = eventType
  formVisible.value = true
}

function handleDelete(eventType: EventType) {
  confirm.require({
    message: `「${eventType.name}」を削除しますか？`,
    header: '削除の確認',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '削除',
    rejectLabel: 'キャンセル',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await deleteEventType(eventType.id)
      toast.add({
        severity: 'success',
        summary: '削除完了',
        detail: `「${eventType.name}」を削除しました`,
        life: 3000,
      })
    },
  })
}

async function handleSave(data: {
  name: string
  description: string | null
  systemPrompt: string
  isActive: boolean
}) {
  if (editingEventType.value) {
    await updateEventType(editingEventType.value.id, data)
    toast.add({
      severity: 'success',
      summary: '更新完了',
      detail: `「${data.name}」を更新しました`,
      life: 3000,
    })
  } else {
    await createEventType(data)
    toast.add({
      severity: 'success',
      summary: '作成完了',
      detail: `「${data.name}」を作成しました`,
      life: 3000,
    })
  }
  formVisible.value = false
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen surface-ground">
    <AppHeader title="イベント種類管理" show-back>
      <template #actions>
        <Button icon="pi pi-sign-out" variant="outlined" severity="secondary" @click="handleLogout" />
      </template>
    </AppHeader>

    <!-- Main content -->
    <main class="grid grid-nogutter justify-content-center px-3 py-4">
      <div class="col-12 lg:col-10">
        <div class="flex justify-content-between align-items-center mb-4">
          <h2 class="text-2xl font-bold m-0">イベント種類一覧</h2>
          <Button label="新規作成" icon="pi pi-plus" @click="handleCreate" />
        </div>

        <div class="surface-card border-round p-3 mb-3 text-sm text-600 flex flex-column gap-2">
          <h4 class="m-0 mb-2"><i class="pi pi-info-circle mr-1" /> イベント種類とは</h4>
          <p class="m-0">イベント種類とは、LLMの起動時に最初に渡される、いわゆる「システムプロンプト」です。</p>
          <p class="m-0">過去記事の例やテンプレート、文章として変えない箇所を指定することで、作成される記事の品質やスタイルをコントロールできます。</p>
          <p class="m-0">作成されたイベント種類はすべてのアカウントで共有されます。</p>
        </div>

        <div v-if="loading" class="flex justify-content-center py-5">
          <ProgressSpinner />
        </div>

        <p v-else-if="eventTypes.length === 0" class="text-center text-600 py-3">
          イベント種類がまだ登録されていません。
        </p>

        <div v-else class="flex flex-column gap-3">
          <Card v-for="eventType in eventTypes" :key="eventType.id">
            <template #content>
              <div class="flex flex-column gap-2">
                <div class="flex align-items-center gap-2 flex-wrap">
                  <Tag
                    :value="eventType.isActive ? '有効' : '無効'"
                    :severity="eventType.isActive ? 'success' : 'secondary'"
                  />
                </div>
                <h3 class="text-lg font-bold m-0">{{ eventType.name }}</h3>
                <span v-if="eventType.description" class="text-600">{{ eventType.description }}</span>
                <div class="flex align-items-center gap-2 mt-2">
                  <Button
                    class="flex-1"
                    icon="pi pi-pencil"
                    severity="primary"
                    variant="outlined"
                    label="編集する"
                    @click="handleEdit(eventType)"
                  />
                  <Button
                    class="flex-1"
                    icon="pi pi-trash"
                    severity="danger"
                    variant="outlined"
                    label="削除する"
                    @click="handleDelete(eventType)"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </main>

    <EventTypeForm
      :visible="formVisible"
      :event-type="editingEventType"
      @update:visible="formVisible = $event"
      @save="handleSave"
    />
  </div>
</template>
