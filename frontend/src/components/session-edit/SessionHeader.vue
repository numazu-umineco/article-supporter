<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Session } from '@/types'

defineProps<{
  session: Session
  saving: boolean
  saved: boolean
  publishing: boolean
  compact: boolean
}>()

const emit = defineEmits<{
  publish: []
}>()

const router = useRouter()
const confirm = useConfirm()

function handlePublishUpdate() {
  confirm.require({
    message: 'Pull Request を現在の状態に更新しますか？',
    header: 'PR更新の確認',
    icon: 'pi pi-refresh',
    acceptLabel: '更新',
    acceptProps: { severity: 'info' },
    rejectLabel: 'キャンセル',
    rejectProps: { severity: 'secondary' },
    accept: () => {
      emit('publish')
    },
  })
}
</script>

<template>
  <header class="surface-card shadow-1 p-3">
    <div class="flex align-items-center justify-content-between gap-2">
      <div class="flex align-items-center gap-3 min-w-0">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          @click="router.push('/')"
          class="flex-shrink-0"
        />
        <div class="flex align-items-center gap-3 min-w-0">
          <div class="flex align-items-center gap-2 min-w-0">
            <span class="font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis">{{ session.eventType?.name || '-' }}</span>
            <span class="text-600 white-space-nowrap flex-shrink-0">{{ session.eventDate }}</span>
          </div>
          <div class="flex-shrink-0">
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

      <div class="flex align-items-center gap-2 flex-shrink-0">
        <template v-if="session.status === 'draft'">
          <Button
            :label="compact ? undefined : 'PR作成'"
            icon="pi pi-send"
            :loading="publishing"
            :disabled="publishing"
            @click="emit('publish')"
          />
        </template>
        <template v-else-if="session.status === 'pr_created'">
          <a v-if="session.prUrl" :href="session.prUrl" target="_blank" class="no-underline">
            <Button
              :label="compact ? undefined : `PR #${session.prNumber}`"
              icon="pi pi-github"
              severity="info"
              outlined
              v-tooltip.bottom="compact ? `PR #${session.prNumber}` : undefined"
            />
          </a>
          <Button
            :label="compact ? undefined : 'PRを更新'"
            icon="pi pi-refresh"
            severity="secondary"
            :loading="publishing"
            :disabled="publishing"
            v-tooltip.bottom="compact ? 'PRを更新' : undefined"
            @click="handlePublishUpdate"
          />
        </template>
        <template v-else-if="session.status === 'merged' || session.status === 'closed'">
          <a v-if="session.prUrl" :href="session.prUrl" target="_blank" class="no-underline">
            <Button
              :label="compact ? undefined : `PR #${session.prNumber}`"
              icon="pi pi-external-link"
              severity="info"
              outlined
              v-tooltip.bottom="compact ? `PR #${session.prNumber}` : undefined"
            />
          </a>
          <Tag
            :value="session.status === 'merged' ? 'マージ済み' : 'クローズ済み'"
            :severity="session.status === 'merged' ? 'success' : 'danger'"
          />
        </template>
      </div>
    </div>
  </header>
</template>
