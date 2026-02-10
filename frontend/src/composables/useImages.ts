import { ref } from 'vue'
import { useApi } from './useApi'
import type { SessionImage } from '@/types'

export function useImages(sessionId: string) {
  const { upload, patch, delete: del } = useApi()

  const images = ref<SessionImage[]>([])
  const uploading = ref(false)

  function setImages(newImages: SessionImage[]) {
    images.value = newImages
  }

  async function uploadImage(file: File): Promise<SessionImage> {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const image = await upload<SessionImage>(
        `/api/sessions/${sessionId}/images`,
        formData
      )
      images.value = [...images.value, image]
      return image
    } finally {
      uploading.value = false
    }
  }

  async function updateImage(
    imageId: string,
    data: { customFilename?: string; isEyecatch?: boolean }
  ): Promise<SessionImage> {
    const updated = await patch<SessionImage>(
      `/api/sessions/${sessionId}/images/${imageId}`,
      data
    )
    images.value = images.value.map((img) =>
      img.id === imageId ? updated : (data.isEyecatch ? { ...img, isEyecatch: false } : img)
    )
    return updated
  }

  async function deleteImage(imageId: string): Promise<void> {
    await del<{ success: boolean }>(
      `/api/sessions/${sessionId}/images/${imageId}`
    )
    images.value = images.value.filter((img) => img.id !== imageId)
  }

  return {
    images,
    uploading,
    setImages,
    uploadImage,
    updateImage,
    deleteImage,
  }
}
