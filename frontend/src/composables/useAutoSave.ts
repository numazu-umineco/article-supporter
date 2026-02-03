import { ref, watch, type Ref } from 'vue'

export function useAutoSave(
  saveFn: () => Promise<void>,
  debounceMs: number = 1000
) {
  const saving = ref(false)
  const saved = ref(true)
  let timer: ReturnType<typeof setTimeout> | null = null

  function markDirty() {
    saved.value = false
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      await save()
    }, debounceMs)
  }

  async function save() {
    if (saved.value || saving.value) return
    saving.value = true
    try {
      await saveFn()
      saved.value = true
    } finally {
      saving.value = false
    }
  }

  function watchField(field: Ref) {
    watch(field, () => {
      markDirty()
    })
  }

  return {
    saving,
    saved,
    markDirty,
    save,
    watchField,
  }
}
