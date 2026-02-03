<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Card from 'primevue/card'

const authStore = useAuthStore()
const router = useRouter()

const avatarImage = computed(() => authStore.user?.githubAvatarUrl ?? undefined)
const avatarLabel = computed(() =>
  authStore.user?.githubAvatarUrl ? undefined : authStore.user?.githubLogin.charAt(0).toUpperCase()
)

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
          <h1 class="text-xl font-bold m-0">記事作成支援システム</h1>
          <div class="flex align-items-center gap-3">
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
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="grid grid-nogutter justify-content-center p-4">
      <div class="col-12 lg:col-10">
        <div class="flex justify-content-between align-items-center mb-4">
          <h2 class="text-2xl font-bold m-0">セッション一覧</h2>
          <Button label="新規セッション" icon="pi pi-plus" />
        </div>

        <Card>
          <template #content>
            <p class="text-center text-600 py-5">
              セッションはまだありません。<br />
              「新規セッション」ボタンをクリックして記事を作成してください。
            </p>
          </template>
        </Card>
      </div>
    </main>
  </div>
</template>

