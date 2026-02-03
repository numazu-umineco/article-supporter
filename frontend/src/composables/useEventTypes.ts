import { ref } from 'vue'
import { useApi } from './useApi'
import type { EventType } from '@/types'

export function useEventTypes() {
  const api = useApi()
  const eventTypes = ref<EventType[]>([])
  const loading = ref(false)

  async function fetchEventTypes(activeOnly: boolean = false) {
    loading.value = true
    try {
      const query = activeOnly ? '?active=true' : ''
      eventTypes.value = await api.get<EventType[]>(`/api/event-types${query}`)
    } finally {
      loading.value = false
    }
  }

  async function getEventType(id: string) {
    return api.get<EventType>(`/api/event-types/${id}`)
  }

  async function createEventType(data: {
    name: string
    description?: string | null
    systemPrompt: string
    isActive?: boolean
  }) {
    const result = await api.post<EventType>('/api/event-types', data)
    await fetchEventTypes()
    return result
  }

  async function updateEventType(
    id: string,
    data: {
      name?: string
      description?: string | null
      systemPrompt?: string
      isActive?: boolean
    }
  ) {
    const result = await api.patch<EventType>(`/api/event-types/${id}`, data)
    await fetchEventTypes()
    return result
  }

  async function deleteEventType(id: string) {
    await api.delete(`/api/event-types/${id}`)
    await fetchEventTypes()
  }

  return {
    eventTypes,
    loading,
    fetchEventTypes,
    getEventType,
    createEventType,
    updateEventType,
    deleteEventType,
  }
}
