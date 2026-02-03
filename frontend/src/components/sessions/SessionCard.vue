<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { Session } from '@/types'

const props = defineProps<{
  session: Session
}>()

const emit = defineEmits<{
  click: []
  delete: []
}>()

const statusLabel = computed(() => {
  switch (props.session.status) {
    case 'draft':
      return '下書き'
    case 'pr_created':
      return 'PR作成済み'
    case 'merged':
      return 'マージ済み'
    default:
      return props.session.status
  }
})

const statusSeverity = computed(() => {
  switch (props.session.status) {
    case 'draft':
      return 'warn'
    case 'pr_created':
      return 'info'
    case 'merged':
      return 'success'
    default:
      return 'secondary'
  }
})

const displayTitle = computed(() => props.session.title || '無題')

const eventTypeName = computed(() => props.session.eventType?.name || '-')

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP')
}
</script>

<template>
  <Card class="cursor-pointer session-card" @click="emit('click')">
    <template #content>
      <div class="flex justify-content-between align-items-start">
        <div class="flex-1">
          <div class="flex align-items-center gap-2 mb-2">
            <h3 class="text-lg font-bold m-0">{{ displayTitle }}</h3>
            <Tag :value="statusLabel" :severity="statusSeverity" />
          </div>
          <div class="flex flex-column gap-1 text-sm text-600">
            <span><i class="pi pi-tag mr-1" />{{ eventTypeName }}</span>
            <span><i class="pi pi-calendar mr-1" />{{ formatDate(session.eventDate) }}</span>
            <span class="text-xs">更新: {{ formatDate(session.updatedAt) }}</span>
          </div>
          <a
            v-if="session.prUrl"
            :href="session.prUrl"
            target="_blank"
            class="text-sm mt-2 inline-block"
            @click.stop
          >
            <i class="pi pi-external-link mr-1" />PR #{{ session.prNumber }}
          </a>
        </div>
        <div class="flex gap-1">
          <Button
            v-if="session.status === 'draft'"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            @click.stop="emit('delete')"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.session-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
