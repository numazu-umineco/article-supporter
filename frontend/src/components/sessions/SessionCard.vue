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
  <Card class="session-card">
    <template #content>
      <div class="flex flex-column gap-2">
        <div class="flex align-items-center gap-2 flex-wrap">
          <Tag :value="statusLabel" :severity="statusSeverity" />
          <span class="text-xs text-600">最終更新: {{ formatDate(session.updatedAt) }}</span>
        </div>
        <h3 class="text-lg font-bold m-0">{{ displayTitle }}</h3>
        <div class="flex align-items-center gap-2">
          <span class="text-600"><i class="pi pi-tag mr-1" />{{ eventTypeName }}</span>
          <span class="text-600"><i class="pi pi-calendar mr-1" />{{ formatDate(session.eventDate) }}</span>
        </div>
        <div class="flex align-item-center gap-2 mt-3">
          <Button
            class="flex-1"
            icon="pi pi-pencil"
            severity="primary"
            variant="outlined"
            label="編集画面へ"
            @click.stop="emit('click')"
          />
          <Button
            v-if="session.status === 'draft'"
            class="flex-1"
            icon="pi pi-trash"
            severity="danger"
            variant="outlined"
            label="削除する"
            @click.stop="emit('delete')"
          />
          <Button
            v-if="session.prUrl"
            as="a"
            class="flex-1"
            :href="session.prUrl"
            target="_blank"
            icon="pi pi-external-link"
            severity="secondary"
            variant="outlined"
            label="PRを見る"
            @click.stop
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.session-card a {
  text-decoration: none;
}
</style>
