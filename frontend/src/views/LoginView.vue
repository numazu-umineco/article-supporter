<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import Card from 'primevue/card'
import Button from 'primevue/button'

const authStore = useAuthStore()
</script>

<template>
  <div class="login-container flex align-items-center justify-content-center min-h-screen surface-ground">
    <Card class="w-full max-w-30rem shadow-4">
      <template #title>
        <div class="text-center">
          <i class="pi pi-file-edit text-5xl text-primary mb-3"></i>
          <h1 class="text-2xl font-bold m-0">記事作成支援システム</h1>
        </div>
      </template>
      <template #content>
        <p class="text-center text-600 mb-4">GitHubアカウントでログインしてください。</p>
        <Button
          label="GitHubでログイン"
          icon="pi pi-github"
          class="w-full"
          size="large"
          @click="authStore.login()"
        />
      </template>
    </Card>
  </div>
</template>

<style scoped>
.login-container {
  background: linear-gradient(135deg, var(--surface-ground) 0%, var(--surface-100) 100%);
}
</style>
