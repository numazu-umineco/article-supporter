<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Session } from '@/types'

defineProps<{
  session: Session
  saving: boolean
  saved: boolean
  publishing: boolean
}>()

const emit = defineEmits<{
  publish: []
}>()

const router = useRouter()
</script>

<template>
  <header class="surface-card shadow-1 px-4 py-3">
    <div class="flex align-items-center justify-content-between">
      <div class="flex align-items-center gap-3">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          @click="router.push('/')"
        />
        <div class="flex align-items-center gap-3">
          <div class="flex align-items-center gap-2">
            <span class="font-bold">{{ session.eventType?.name || '-' }}</span>
            <span class="text-600">{{ session.eventDate }}</span>
          </div>
          <div>
            <Tag
              v-if="saving"
              value="保存中..."
              severity="warn"
              class="text-xs"
            />
            <Tag
              v-else-if="saved"
              value="保存済み"
              severity="success"
              class="text-xs"
            />
            <Tag
              v-else
              value="未保存"
              severity="secondary"
              class="text-xs"
            />
          </div>
        </div>
      </div>

      <div class="flex align-items-center gap-2">
        <template v-if="session.status === 'draft'">
          <Button
            label="PR作成"
            icon="pi pi-send"
            :loading="publishing"
            :disabled="publishing"
            @click="emit('publish')"
          />
        </template>
        <template v-else-if="session.status === 'pr_created'">
          <a v-if="session.prUrl" :href="session.prUrl" target="_blank" class="no-underline">
            <Button
              :label="`PR #${session.prNumber}`"
              icon="pi pi-external-link"
              severity="info"
              outlined
            />
          </a>
          <Button
            label="PRを更新"
            icon="pi pi-refresh"
            severity="secondary"
            :loading="publishing"
            :disabled="publishing"
            @click="emit('publish')"
          />
        </template>
        <template v-else-if="session.status === 'merged'">
          <a v-if="session.prUrl" :href="session.prUrl" target="_blank" class="no-underline">
            <Button
              :label="`PR #${session.prNumber}`"
              icon="pi pi-external-link"
              severity="info"
              outlined
            />
          </a>
          <Tag
            value="マージ済み"
            severity="success"
          />
        </template>
      </div>
    </div>
  </header>
</template>
