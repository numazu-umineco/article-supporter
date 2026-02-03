<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessions } from '@/composables/useSessions'
import ProgressSpinner from 'primevue/progressspinner'
import AppHeader from '@/components/AppHeader.vue'
import type { Session } from '@/types'

const route = useRoute()
const router = useRouter()
const { getSession } = useSessions()

const session = ref<Session | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const id = route.params.id as string
    session.value = await getSession(id)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen surface-ground">
    <AppHeader :title="session?.title || '無題'" show-back />

    <main class="grid grid-nogutter justify-content-center p-4">
      <div v-if="loading" class="col-12 flex justify-content-center py-5">
        <ProgressSpinner />
      </div>
      <div v-else-if="session" class="col-12 lg:col-10">
        <p class="text-600">
          記事編集画面は Phase 5 で実装されます。
        </p>
      </div>
    </main>
  </div>
</template>
