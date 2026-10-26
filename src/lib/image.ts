/**
 * Pipeline de imagen, todo en el navegador (sin coste de servidor):
 *   foto → quitar fondo (modelo ONNX vía @imgly/background-removal)
 *        → recortar al contorno de la prenda → redimensionar → WebP comprimido
 */

export type Progreso = (fase: 'modelo' | 'fondo' | 'comprimir', fraccion?: number) => void

export async function quitarFondo(foto: Blob, progreso?: Progreso): Promise<Blob> {
  // Import dinámico: la librería (y su runtime ONNX) solo se descarga al añadir prendas
  const { removeBackground } = await import('@imgly/background-removal')
  progreso?.('modelo', 0)
  return removeBackground(foto, {
    output: { format: 'image/png', quality: 1 },
    progress: (clave, actual, total) => {
      if (clave.startsWith('fetch')) progreso?.('modelo', total ? actual / total : undefined)
      else progreso?.('fondo')
    },
  })
}

interface OpcionesCompresion {
  /** Lado mayor máximo en px. */
  max?: number
  /** Calidad WebP 0–1. */
  calidad?: number
  /** Recortar márgenes transparentes (solo tiene efecto si se quitó el fondo). */
  recortar?: boolean
}

export async function comprimir(
  imagen: Blob,
  { max = 900, calidad = 0.8, recortar = true }: OpcionesCompresion = {},
): Promise<Blob> {
  const bmp = await createImageBitmap(imagen)
  let caja = { x: 0, y: 0, w: bmp.width, h: bmp.height }
  if (recortar) caja = contornoOpaco(bmp) ?? caja

  const escala = Math.min(1, max / Math.max(caja.w, caja.h))
  const w = Math.max(1, Math.round(caja.w * escala))
  const h = Math.max(1, Math.round(caja.h * escala))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, caja.x, caja.y, caja.w, caja.h, 0, 0, w, h)
  bmp.close()

  const webp = await aBlob(canvas, 'image/webp', calidad)
  if (webp.type === 'image/webp') return webp
  // Safari no codifica WebP y devuelve PNG: vale si hay transparencia, si no JPEG pesa mucho menos
  return recortar ? webp : aBlob(canvas, 'image/jpeg', calidad)
}

/** Caja que contiene los píxeles no transparentes, con un pequeño margen. */
function contornoOpaco(bmp: ImageBitmap) {
  const muestra = 256
  const k = Math.min(1, muestra / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null

  const margen = 0.03
  const sx = Math.max(0, (x0 / k) - bmp.width * margen)
  const sy = Math.max(0, (y0 / k) - bmp.height * margen)
  const ex = Math.min(bmp.width, ((x1 + 1) / k) + bmp.width * margen)
  const ey = Math.min(bmp.height, ((y1 + 1) / k) + bmp.height * margen)
  return { x: sx, y: sy, w: ex - sx, h: ey - sy }
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number) {
  return new Promise<Blob>((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo codificar la imagen'))), tipo, calidad),
  )
}

export const kb = (b: Blob) => `${Math.max(1, Math.round(b.size / 1024))} KB`
