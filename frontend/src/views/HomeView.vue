<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSessions } from '@/composables/useSessions'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import AppHeader from '@/components/AppHeader.vue'
import SessionCard from '@/components/sessions/SessionCard.vue'
import NewSessionDialog from '@/components/sessions/NewSessionDialog.vue'
import type { Session } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const { sessions, loading, fetchSessions, deleteSession } = useSessions()

const showNewSessionDialog = ref(false)

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
          <Button label="新規セッション" icon="pi pi-plus" @click="showNewSessionDialog = true" />
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

    <NewSessionDialog v-model:visible="showNewSessionDialog" />
  </div>
</template>
