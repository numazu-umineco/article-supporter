import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  async function initialize() {
    if (initialized.value) return

    loading.value = true
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        user.value = await response.json()
      }
    } catch {
      // User not authenticated
      user.value = null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      user.value = null
    }
  }

  function login() {
    window.location.href = '/api/auth/login'
  }

  return {
    user,
    initialized,
    loading,
    isAuthenticated,
    initialize,
    logout,
    login,
  }
})
