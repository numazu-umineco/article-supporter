import { useToast } from 'primevue/usetoast'

class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function useApi() {
  const toast = useToast()

  async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string } } = {}
      try {
        errorData = await response.json()
      } catch {
        // Response is not JSON
      }

      const errorMessage = errorData.error?.message || 'An error occurred'
      const errorCode = errorData.error?.code || 'UNKNOWN_ERROR'

      if (response.status === 401) {
        window.location.href = '/login'
        throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401)
      }

      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000,
      })

      throw new ApiError(errorMessage, errorCode, response.status)
    }

    return response.json()
  }

  async function upload<T>(url: string, formData: FormData): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string } } = {}
      try {
        errorData = await response.json()
      } catch {
        // Response is not JSON
      }

      const errorMessage = errorData.error?.message || 'An error occurred'
      const errorCode = errorData.error?.code || 'UNKNOWN_ERROR'

      if (response.status === 401) {
        window.location.href = '/login'
        throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401)
      }

      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000,
      })

      throw new ApiError(errorMessage, errorCode, response.status)
    }

    return response.json()
  }

  return {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body?: unknown) =>
      request<T>(url, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    patch: <T>(url: string, body: unknown) =>
      request<T>(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: <T>(url: string) =>
      request<T>(url, {
        method: 'DELETE',
      }),
    upload,
  }
}
