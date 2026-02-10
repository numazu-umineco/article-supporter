const MAX_LONG_SIDE = 1800

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const quality = mimeType === 'image/jpeg' ? 0.9 : undefined
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      mimeType,
      quality
    )
  })
}

export async function resizeImage(file: File): Promise<File> {
  // GIF はアニメーションが失われるのでリサイズしない
  if (file.type === 'image/gif') return file

  const img = await loadImage(file)

  const longSide = Math.max(img.width, img.height)
  if (longSide <= MAX_LONG_SIDE) return file

  const scale = MAX_LONG_SIDE / longSide
  const newWidth = Math.round(img.width * scale)
  const newHeight = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, newWidth, newHeight)

  const blob = await canvasToBlob(canvas, file.type)
  return new File([blob], file.name, { type: file.type })
}
