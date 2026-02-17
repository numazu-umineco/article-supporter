<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

withDefaults(
  defineProps<{
    title: string
    showBack?: boolean
    backTo?: string
  }>(),
  {
    showBack: false,
    backTo: '/',
  }
)

const router = useRouter()
</script>

<template>
  <header class="surface-card shadow-1 p-3">
    <div class="grid grid-nogutter justify-content-center">
      <div class="col-12 lg:col-10 flex align-items-center justify-content-between">
        <div class="flex align-items-center gap-2 md:gap-3">
          <Button
            v-if="showBack"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            rounded
            @click="router.push(backTo)"
          />
          <h1 class="text-xl font-bold m-0">{{ title }}</h1>
        </div>
        <div v-if="$slots.actions" class="flex align-items-center gap-2 md:gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>
