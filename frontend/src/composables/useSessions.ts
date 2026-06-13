import { ref } from 'vue'
import { useApi } from './useApi'
import type { Session } from '@/types'

export function useSessions() {
  const api = useApi()
  const sessions = ref<Session[]>([])
  const loading = ref(false)

  async function fetchSessions() {
    loading.value = true
    try {
      sessions.value = await api.get<Session[]>('/api/sessions')
    } finally {
      loading.value = false
    }
  }

  async function getSession(id: string) {
    return api.get<Session>(`/api/sessions/${id}`)
  }

  async function createSession(data: { eventTypeId: string; eventDate: string; model?: string }) {
    return api.post<Session>('/api/sessions', data)
  }

  async function updateSession(
    id: string,
    data: {
      title?: string | null
      slug?: string | null
      articleContent?: string | null
      eyecatchImageId?: string | null
    }
  ) {
    return api.patch<Session>(`/api/sessions/${id}`, data)
  }

  async function publishSession(id: string) {
    return api.post<Session>(`/api/sessions/${id}/publish`)
  }

  async function deleteSession(id: string) {
    await api.delete(`/api/sessions/${id}`)
    await fetchSessions()
  }

  return {
    sessions,
    loading,
    fetchSessions,
    getSession,
    createSession,
    updateSession,
    publishSession,
    deleteSession,
  }
}
