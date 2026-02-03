<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSessions } from '@/composables/useSessions'
import { useEventTypes } from '@/composables/useEventTypes'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import AppHeader from '@/components/AppHeader.vue'
import SessionCard from '@/components/sessions/SessionCard.vue'
import type { Session } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const { sessions, loading, fetchSessions, deleteSession, createSession } = useSessions()
const { eventTypes, loading: loadingEventTypes, fetchEventTypes } = useEventTypes()

const showNewSessionDialog = ref(false)
const eventDate = ref<Date | null>(null)
const selectedEventTypeId = ref<string | null>(null)
const creating = ref(false)

const avatarImage = computed(() => authStore.user?.githubAvatarUrl ?? undefined)
const avatarLabel = computed(() =>
  authStore.user?.githubAvatarUrl ? undefined : authStore.user?.githubLogin.charAt(0).toUpperCase()
)

onMounted(() => {
  fetchSessions()
})

function handleSessionClick(session: Session) {
  router.push(`/sessions/${session.id}`)
}

function handleDeleteSession(session: Session) {
  confirm.require({
    message: `「${session.title || '無題'}」を削除しますか？`,
    header: '削除の確認',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '削除',
    rejectLabel: 'キャンセル',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await deleteSession(session.id)
      toast.add({
        severity: 'success',
        summary: '削除完了',
        detail: 'セッションを削除しました',
        life: 3000,
      })
    },
  })
}

function openNewSessionDialog() {
  eventDate.value = null
  selectedEventTypeId.value = null
  fetchEventTypes(true)
  showNewSessionDialog.value = true
}

function formatDateToString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function handleCreateSession() {
  if (!eventDate.value || !selectedEventTypeId.value) return

  creating.value = true
  try {
    const session = await createSession({
      eventTypeId: selectedEventTypeId.value,
      eventDate: formatDateToString(eventDate.value),
    })
    showNewSessionDialog.value = false
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

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen surface-ground">
    <AppHeader title="記事作成支援システム">
      <template #actions>
        <div v-if="authStore.user" class="flex align-items-center gap-2">
          <Avatar
            :image="avatarImage"
            :label="avatarLabel"
            shape="circle"
          />
          <span class="font-medium">{{ authStore.user.githubLogin }}</span>
        </div>
        <Button
          icon="pi pi-cog"
          label="イベント種類管理"
          severity="secondary"
          text
          @click="router.push('/event-types')"
        />
        <Button icon="pi pi-sign-out" variant="outlined" severity="secondary" @click="handleLogout" />
      </template>
    </AppHeader>

    <!-- Main content -->
    <main class="grid grid-nogutter justify-content-center p-4">
      <div class="col-12 lg:col-10">
        <div class="flex justify-content-between align-items-center mb-4">
          <h2 class="text-2xl font-bold m-0">セッション一覧</h2>
          <Button label="新規セッション" icon="pi pi-plus" @click="openNewSessionDialog" />
        </div>

        <div v-if="loading" class="flex justify-content-center py-5">
          <ProgressSpinner />
        </div>

        <div v-else-if="sessions.length === 0">
          <Card>
            <template #content>
              <p class="text-center text-600 py-5">
                セッションはまだありません。<br />
                「新規セッション」ボタンをクリックして記事を作成してください。
              </p>
            </template>
          </Card>
        </div>

        <div v-else class="flex flex-column gap-3">
          <SessionCard
            v-for="session in sessions"
            :key="session.id"
            :session="session"
            @click="handleSessionClick(session)"
            @delete="handleDeleteSession(session)"
          />
        </div>
      </div>
    </main>

    <!-- New Session Dialog -->
    <Dialog
      v-model:visible="showNewSessionDialog"
      header="新規セッション作成"
      :style="{ width: '28rem' }"
      modal
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
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="キャンセル"
          severity="secondary"
          text
          @click="showNewSessionDialog = false"
        />
        <Button
          label="作成"
          icon="pi pi-plus"
          :loading="creating"
          :disabled="!eventDate || !selectedEventTypeId"
          @click="handleCreateSession"
        />
      </template>
    </Dialog>
  </div>
</template>
