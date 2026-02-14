import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

const REFRESH_INTERVAL = 13 * 60 * 1000 // 13分（JWT有効期限15分 - 2分バッファ）

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let visibilityHandlerRegistered = false

  const isAuthenticated = computed(() => !!user.value)

  async function tryRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      return response.ok
    } catch {
      return false
    }
  }

  function startTokenRefresh() {
    stopTokenRefresh()
    refreshTimer = setInterval(async () => {
      const ok = await tryRefresh()
      if (!ok) {
        user.value = null
        stopTokenRefresh()
      }
    }, REFRESH_INTERVAL)
  }

  function stopTokenRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  function setupVisibilityHandler() {
    if (visibilityHandlerRegistered) return
    visibilityHandlerRegistered = true

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && user.value) {
        const ok = await tryRefresh()
        if (ok) {
          startTokenRefresh()
        } else {
          user.value = null
          stopTokenRefresh()
        }
      }
    })
  }

  async function initialize() {
    if (initialized.value) return

    loading.value = true
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        user.value = await response.json()
        startTokenRefresh()
        setupVisibilityHandler()
      } else if (response.status === 401) {
        // JWT が切れていてもリフレッシュトークンが有効なら復帰
        const refreshed = await tryRefresh()
        if (refreshed) {
          const retryResponse = await fetch('/api/auth/me', {
            credentials: 'include',
          })
          if (retryResponse.ok) {
            user.value = await retryResponse.json()
            startTokenRefresh()
            setupVisibilityHandler()
          }
        }
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
      stopTokenRefresh()
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
