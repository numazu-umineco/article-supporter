<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventTypes } from '@/composables/useEventTypes'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
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
    <!-- Header -->
    <header class="surface-card shadow-1 px-4 py-3">
      <div class="grid grid-nogutter justify-content-center">
        <div class="col-12 lg:col-10 flex align-items-center justify-content-between">
          <div class="flex align-items-center gap-3">
            <Button
              icon="pi pi-arrow-left"
              severity="secondary"
              text
              rounded
              @click="router.push('/')"
            />
            <h1 class="text-xl font-bold m-0">イベント種類管理</h1>
          </div>
          <Button icon="pi pi-sign-out" variant="outlined" severity="secondary" @click="handleLogout" />
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="grid grid-nogutter justify-content-center p-4">
      <div class="col-12 lg:col-10">
        <div class="flex justify-content-between align-items-center mb-4">
          <h2 class="text-2xl font-bold m-0">イベント種類一覧</h2>
          <Button label="新規作成" icon="pi pi-plus" @click="handleCreate" />
        </div>

        <DataTable :value="eventTypes" :loading="loading" striped-rows>
          <template #empty>
            <p class="text-center text-600 py-3">イベント種類がまだ登録されていません。</p>
          </template>

          <Column field="name" header="名前" />
          <Column field="description" header="説明">
            <template #body="{ data }">
              <span class="text-600">{{ data.description || '-' }}</span>
            </template>
          </Column>
          <Column field="isActive" header="ステータス" :style="{ width: '120px' }">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? '有効' : '無効'"
                :severity="data.isActive ? 'success' : 'secondary'"
              />
            </template>
          </Column>
          <Column header="操作" :style="{ width: '150px' }">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  @click="handleEdit(data)"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  @click="handleDelete(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </main>

    <EventTypeForm
      :visible="formVisible"
      :event-type="editingEventType"
      @update:visible="formVisible = $event"
      @save="handleSave"
    />
    <ConfirmDialog />
  </div>
</template>
