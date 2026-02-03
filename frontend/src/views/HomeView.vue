<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Card from 'primevue/card'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen surface-ground">
    <!-- Header -->
    <header class="surface-card shadow-1 px-4 py-3">
      <div class="flex align-items-center justify-content-between max-w-1200 mx-auto">
        <h1 class="text-xl font-bold m-0">記事作成支援システム</h1>
        <div class="flex align-items-center gap-3">
          <div v-if="authStore.user" class="flex align-items-center gap-2">
            <Avatar
              :image="authStore.user.githubAvatarUrl ?? undefined"
              :label="authStore.user.githubLogin.charAt(0).toUpperCase()"
              shape="circle"
            />
            <span class="font-medium">{{ authStore.user.githubLogin }}</span>
          </div>
          <Button label="ログアウト" icon="pi pi-sign-out" severity="secondary" text @click="handleLogout" />
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="p-4 max-w-1200 mx-auto">
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
    </main>
  </div>
</template>

<style scoped>
.max-w-1200 {
  max-width: 1200px;
}
</style>
