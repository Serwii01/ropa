/**
 * Pipeline de imagen, todo en el navegador (sin coste de servidor):
 *   foto → quitar fondo (modelo ONNX vía @imgly/background-removal)
 *        → recortar al contorno de la prenda → redimensionar → WebP comprimido
 */

import { areaMascara, cajaMascara, limpiarMascara, quitarHalo, type Caja } from './mascara'

export type Progreso = (fase: 'modelo' | 'fondo' | 'comprimir', fraccion?: number) => void

const DESCARGA_ESTIMADA = 110e6 // bytes: modelo + runtime

let modeloListo = false
const LADO = 1600 // de trabajo: de sobra para guardar a 900 px y ligero para el móvil

/** No se ha encontrado ninguna prenda en la foto. */
export class SinPrenda extends Error {}

export async function quitarFondo(foto: Blob, progreso?: Progreso): Promise<Blob> {
  // Import dinámico: la librería (y su runtime ONNX) solo se descarga al añadir prendas
  const { segmentForeground } = await import('@imgly/background-removal')
  // La librería solo avisa a la función de la primera llamada: con el modelo ya cargado, se avisa aquí
  if (modeloListo) progreso?.('fondo')
  else progreso?.('modelo', 0)
  // Se descargan varios archivos y cada uno avisa por separado: se suman. El total no se conoce
  // hasta empezar el último, así que se parte de una estimación y la barra nunca retrocede.
  const archivos = new Map<string, [number, number]>()
  let fraccion = 0
  const progress = (clave: string, actual: number, total: number) => {
    if (!clave.startsWith('fetch')) return progreso?.('fondo')
    archivos.set(clave, [actual, total])
    let bajado = 0
    let suma = 0
    for (const [b, t] of archivos.values()) {
      bajado += b
      suma += t
    }
    fraccion = Math.max(fraccion, bajado / Math.max(suma, DESCARGA_ESTIMADA))
    progreso?.('modelo', fraccion)
  }

  async function mascara(lienzo: HTMLCanvasElement) {
    const entrada = await aBlob(lienzo, 'image/png', 1)
    const bmp = await createImageBitmap(
      await segmentForeground(entrada, { output: { format: 'image/png', quality: 1 }, progress }),
    )
    modeloListo = true
    const c = crearLienzo(lienzo.width, lienzo.height)
    c.ctx.drawImage(bmp, 0, 0)
    bmp.close()
    const { data } = c.ctx.getImageData(0, 0, lienzo.width, lienzo.height)
    const alfa = new Uint8Array(data.length / 4)
    for (let i = 0; i < alfa.length; i++) alfa[i] = data[i * 4 + 3]
    return limpiarMascara(alfa, lienzo.width, lienzo.height)
  }

  const bmp = await createImageBitmap(foto)
  try {
    // 1.ª pasada: localizar la prenda
    let zona: Caja = { x: 0, y: 0, w: bmp.width, h: bmp.height }
    let lienzo = dibujar(bmp, zona)
    let alfa = await mascara(lienzo.canvas)
    const caja = cajaMascara(alfa, lienzo.canvas.width, lienzo.canvas.height)
    if (!caja || areaMascara(alfa) < 0.005) throw new SinPrenda()

    // 2.ª pasada, solo si sobra fondo: el modelo trabaja a 1024×1024, así que de cerca ve mejor el borde
    const k = bmp.width / lienzo.canvas.width
    const cerca = ampliar({ x: caja.x * k, y: caja.y * k, w: caja.w * k, h: caja.h * k }, bmp.width, bmp.height)
    if (cerca.w * cerca.h < zona.w * zona.h * 0.75) {
      const lienzo2 = dibujar(bmp, cerca)
      const alfa2 = await mascara(lienzo2.canvas)
      // Si de cerca ve algo muy distinto, es que se ha confundido: vale la primera
      const antes = areaMascara(alfa) * zona.w * zona.h
      const despues = areaMascara(alfa2) * cerca.w * cerca.h
      if (Math.abs(despues - antes) < antes * 0.2) {
        zona = cerca
        lienzo = lienzo2
        alfa = alfa2
      }
    }

    const { width, height } = lienzo.canvas
    const imagen = lienzo.ctx.getImageData(0, 0, width, height)
    quitarHalo(imagen.data, alfa, width, height)
    for (let i = 0; i < alfa.length; i++) imagen.data[i * 4 + 3] = alfa[i]
    lienzo.ctx.putImageData(imagen, 0, 0)
    return await aBlob(lienzo.canvas, 'image/png', 1)
  } finally {
    bmp.close()
  }
}

function crearLienzo(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

function dibujar(bmp: ImageBitmap, z: Caja) {
  const e = Math.min(1, LADO / Math.max(z.w, z.h))
  const l = crearLienzo(Math.max(1, Math.round(z.w * e)), Math.max(1, Math.round(z.h * e)))
  l.ctx.drawImage(bmp, z.x, z.y, z.w, z.h, 0, 0, l.canvas.width, l.canvas.height)
  return l
}

/** Añade margen y, si cabe, la hace cuadrada: el modelo deforma a cuadrado lo que recibe. */
function ampliar(c: Caja, maxW: number, maxH: number): Caja {
  const lado = Math.max(c.w, c.h) * 1.2
  const w = Math.min(maxW, lado)
  const h = Math.min(maxH, lado)
  return {
    x: Math.max(0, Math.min(maxW - w, c.x + c.w / 2 - w / 2)),
    y: Math.max(0, Math.min(maxH - h, c.y + c.h / 2 - h / 2)),
    w,
    h,
  }
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
  const muestra = 512
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

  const margen = 0.005
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
