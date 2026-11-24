/**
 * Pipeline de imagen (corre en un worker, sin coste de servidor):
 *   foto → quitar fondo (modelo ONNX vía @imgly/background-removal)
 *        → retocar (luz, perspectiva, giro) → PNG sin pérdida
 *        → encuadrar según el tipo y comprimir, una sola vez
 */
import { cuerpoDe, type Categoria } from './categorias'
import { areaMascara, cajaMascara, limpiarMascara, quitarHalo, type Caja } from './mascara'
import {
  anchoEntre, aplicarLuz, correccionPerspectiva, deformar, giroRecto, inversa, luzDelFondo, mul, proyectar, SIN_LUZ,
  type Luz, type Vec,
} from './retoque'

export type Progreso = (fase: 'modelo' | 'fondo', fraccion?: number) => void

/** La prenda recortada, tal cual salió en la foto y retocada. PNG sin pérdida. */
export interface Recorte { original: Blob; retocada: Blob }

export class SinPrendaError extends Error {}

const DESCARGA_ESTIMADA = 110e6 // bytes: modelo + runtime
const LADO = 1600 // de trabajo: de sobra para guardar a 900 px y ligero para el móvil
const LADO_FINAL = 900
/** El bucket admite 2 MB. Safari no codifica WebP y el PNG puede acercarse. */
const PESO_MAX = 1.8e6

let modeloListo = false
// La librería solo avisa a la función de la primera llamada: se le da una fija que reenvía a la actual
let avisar: Progreso = () => {}
const archivos = new Map<string, [number, number]>()
let fraccion = 0
function progress(clave: string, actual: number, total: number) {
  if (!clave.startsWith('fetch')) return avisar('fondo')
  // Se descargan varios archivos y cada uno avisa por separado: se suman. El total no se conoce
  // hasta empezar el último, así que se parte de una estimación y la barra nunca retrocede.
  archivos.set(clave, [actual, total])
  let bajado = 0
  let suma = 0
  for (const [b, t] of archivos.values()) {
    bajado += b
    suma += t
  }
  fraccion = Math.max(fraccion, bajado / Math.max(suma, DESCARGA_ESTIMADA))
  avisar('modelo', fraccion)
}

export const operaciones = (progreso: Progreso) => ({
  quitarFondo: (foto: Blob, arriba: Vec | null) => quitarFondo(foto, arriba, progreso),
  terminar,
  comprimirConFondo,
  igualar: (foto: Blob, categoria: Categoria) => igualar(foto, categoria, progreso),
  reencuadrar,
})
export type Operaciones = ReturnType<typeof operaciones>

// ─── Quitar el fondo ────────────────────────────────────────
async function quitarFondo(foto: Blob, arriba: Vec | null, progreso: Progreso): Promise<Recorte> {
  avisar = progreso
  if (modeloListo) progreso('fondo')
  else progreso('modelo', 0)
  // Import dinámico: la librería (y su runtime ONNX) solo se descarga al añadir prendas
  const { segmentForeground } = await import('@imgly/background-removal')

  async function mascara(l: Lienzo) {
    const entrada = await l.canvas.convertToBlob({ type: 'image/png' })
    const salida = await segmentForeground(entrada, { output: { format: 'image/png', quality: 1 }, progress })
    modeloListo = true
    const imagen = await leer(salida)
    return limpiarMascara(alfaDe(imagen), imagen.width, imagen.height)
  }

  const bmp = await createImageBitmap(foto)
  try {
    // 1.ª pasada: localizar la prenda
    let zona: Caja = { x: 0, y: 0, w: bmp.width, h: bmp.height }
    let lienzo = dibujar(bmp, zona)
    let alfa = await mascara(lienzo)
    const caja = cajaMascara(alfa, lienzo.canvas.width, lienzo.canvas.height)
    if (!caja || areaMascara(alfa) < 0.005) throw new SinPrendaError()

    // 2.ª pasada, solo si sobra fondo: el modelo trabaja a 1024×1024, así que de cerca ve mejor el borde
    const k = bmp.width / lienzo.canvas.width
    const cerca = ampliar({ x: caja.x * k, y: caja.y * k, w: caja.w * k, h: caja.h * k }, bmp.width, bmp.height)
    if (cerca.w * cerca.h < zona.w * zona.h * 0.75) {
      const lienzo2 = dibujar(bmp, cerca)
      const alfa2 = await mascara(lienzo2)
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
    const luz = luzDelFondo(imagen.data, alfa, width, height) // antes de perder el fondo
    quitarHalo(imagen.data, alfa, width, height)
    for (let i = 0; i < alfa.length; i++) imagen.data[i * 4 + 3] = alfa[i]
    lienzo.ctx.putImageData(imagen, 0, 0)
    const original = await lienzo.canvas.convertToBlob({ type: 'image/png' })

    const M = arriba && correccionPerspectiva(arriba, bmp.width, bmp.height)
    const { lienzo: final } = retocar(imagen, luz, M && ((img) => enderezar(img, M, zona)))
    return { original, retocada: await final.canvas.convertToBlob({ type: 'image/png' }) }
  } finally {
    bmp.close()
  }
}

// ─── Retoque ────────────────────────────────────────────────
/** Modifica `imagen`. `cambiada`: si ha hecho falta tocar algo. */
function retocar(imagen: ImageData, luz: Luz, perspectiva?: ((i: ImageData) => ImageData) | null) {
  const iluminada = aplicarLuz(imagen.data, alfaDe(imagen), imagen.width, imagen.height, luz)
  const img = perspectiva ? perspectiva(imagen) : imagen
  const plano = crearLienzo(img.width, img.height)
  plano.ctx.putImageData(img, 0, 0)
  const giro = giroRecto(alfaDe(img), img.width, img.height)
  if (!giro) return { lienzo: plano, cambiada: iluminada || Boolean(perspectiva) }
  const t = (giro * Math.PI) / 180
  const s = Math.abs(Math.sin(t)), c = Math.abs(Math.cos(t))
  const l = crearLienzo(Math.ceil(img.width * c + img.height * s), Math.ceil(img.width * s + img.height * c))
  l.ctx.translate(l.canvas.width / 2, l.canvas.height / 2)
  l.ctx.rotate(t)
  l.ctx.drawImage(plano.canvas, -img.width / 2, -img.height / 2)
  return { lienzo: l, cambiada: true }
}

/** Aplica a un recorte la corrección de perspectiva `M`, calculada para la foto entera. */
function enderezar(img: ImageData, M: number[], zona: Caja): ImageData {
  const caja = cajaMascara(alfaDe(img), img.width, img.height)
  if (!caja) return img
  const e = img.width / zona.w // px del recorte por px de la foto
  const inv = inversa(M)
  const esquinas = [
    [caja.x, caja.y], [caja.x + caja.w, caja.y], [caja.x, caja.y + caja.h], [caja.x + caja.w, caja.y + caja.h],
  ].map(([x, y]) => proyectar(inv, zona.x + x / e, zona.y + y / e))
  const xs = esquinas.map((p) => p[0]), ys = esquinas.map((p) => p[1])
  const x0 = Math.min(...xs) - 4 / e, y0 = Math.min(...ys) - 4 / e
  const w = Math.ceil((Math.max(...xs) - x0) * e) + 4, h = Math.ceil((Math.max(...ys) - y0) * e) + 4
  if (w > LADO * 1.5 || h > LADO * 1.5) return img
  const aFoto = [1 / e, 0, x0, 0, 1 / e, y0, 0, 0, 1]
  const aRecorte = [e, 0, -zona.x * e, 0, e, -zona.y * e, 0, 0, 1]
  return new ImageData(deformar(img.data, img.width, img.height, mul(aRecorte, mul(M, aFoto)), w, h), w, h)
}

async function igualar(foto: Blob, categoria: Categoria, progreso: Progreso): Promise<Blob | null> {
  const imagen = await leer(foto)
  if (!esRecorte(imagen)) return terminar((await quitarFondo(foto, null, progreso)).retocada, categoria)
  const yaEncuadrada = estaEncuadrada(imagen, categoria)
  const { lienzo, cambiada } = retocar(imagen, SIN_LUZ)
  return cambiada || !yaEncuadrada ? componer(lienzo, categoria) : null
}

async function reencuadrar(foto: Blob, antes: Categoria, ahora: Categoria): Promise<Blob | null> {
  const imagen = await leer(foto)
  // Una foto con fondo o guardada sin retocar se respeta
  if (!esRecorte(imagen) || !cuerpoDe(antes) || !estaEncuadrada(imagen, antes) || estaEncuadrada(imagen, ahora)) return null
  return componer(aLienzo(imagen), ahora)
}

// ─── Encuadre y compresión ──────────────────────────────────
async function terminar(recorte: Blob, categoria: Categoria | null) {
  return componer(aLienzo(await leer(recorte)), categoria)
}

/**
 * Sitio de la prenda (`caja`) en el lienzo de su tipo, en px de la imagen: el cuerpo queda a un
 * ancho parecido al de las demás, para que unas mangas abiertas o recogidas no cambien el tamaño
 * al que se ve. Sin tipo, o si el tipo no lo define, el lienzo se ciñe a la prenda.
 */
function plan(imagen: ImageData, categoria: Categoria | null) {
  const { width, height } = imagen
  const alfa = alfaDe(imagen)
  const caja = cajaMascara(alfa, width, height) ?? { x: 0, y: 0, w: width, h: height }
  const cuerpo = categoria && cuerpoDe(categoria)
  if (!cuerpo) return { caja, w: caja.w, h: caja.h }
  const recortada = new Uint8Array(caja.w * caja.h)
  for (let y = 0; y < caja.h; y++) {
    const o = (caja.y + y) * width + caja.x
    recortada.set(alfa.subarray(o, o + caja.w), y * caja.w)
  }
  const ancho = anchoEntre(recortada, caja.w, caja.h, cuerpo.desde, cuerpo.hasta)
  const [cw, ch] = cuerpo.cm
  // cm por píxel si la prenda llenase su caja; con el ancho de cuerpo típico solo se reduce, y
  // poco: una prenda holgada debe seguir pareciéndolo
  const llena = Math.min(cw / caja.w, ch / caja.h)
  const escala = ancho ? Math.max(llena * 0.8, Math.min(llena, cuerpo.ancho / ancho)) : llena
  return { caja, w: cw / escala, h: ch / escala }
}

function estaEncuadrada(imagen: ImageData, categoria: Categoria) {
  const { caja, w, h } = plan(imagen, categoria)
  const cerca = (a: number, b: number) => Math.abs(a / b - 1) < 0.02
  return cerca(imagen.width, w) && cerca(imagen.height, h) && caja.y < imagen.height * 0.02
}

async function componer(l: Lienzo, categoria: Categoria | null) {
  const { caja, w, h } = plan(l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height), categoria)
  for (let max = LADO_FINAL; ; max *= 0.85) {
    const e = Math.min(1, max / Math.max(w, h))
    const f = crearLienzo(Math.round(w * e), Math.round(h * e))
    f.ctx.drawImage(l.canvas, caja.x, caja.y, caja.w, caja.h, ((w - caja.w) / 2) * e, 0, caja.w * e, caja.h * e)
    // Si el navegador no sabe hacer WebP devuelve PNG, que también guarda la transparencia
    const blob = await f.canvas.convertToBlob({ type: 'image/webp', quality: 0.86 })
    if (blob.size <= PESO_MAX || max < 400) return blob
  }
}

async function comprimirConFondo(foto: Blob) {
  const bmp = await createImageBitmap(foto)
  try {
    for (let max = 1100; ; max *= 0.85) {
      const { canvas } = dibujar(bmp, { x: 0, y: 0, w: bmp.width, h: bmp.height }, max)
      let blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })
      if (blob.type !== 'image/webp') blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 })
      if (blob.size <= PESO_MAX || max < 400) return blob
    }
  } finally {
    bmp.close()
  }
}

// ─── Lienzos ────────────────────────────────────────────────
type Lienzo = ReturnType<typeof crearLienzo>

function crearLienzo(w: number, h: number) {
  const canvas = new OffscreenCanvas(Math.max(1, w), Math.max(1, h))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

function dibujar(bmp: ImageBitmap, z: Caja, lado = LADO) {
  const e = Math.min(1, lado / Math.max(z.w, z.h))
  const l = crearLienzo(Math.round(z.w * e), Math.round(z.h * e))
  l.ctx.drawImage(bmp, z.x, z.y, z.w, z.h, 0, 0, l.canvas.width, l.canvas.height)
  return l
}

function aLienzo(imagen: ImageData) {
  const l = crearLienzo(imagen.width, imagen.height)
  l.ctx.putImageData(imagen, 0, 0)
  return l
}

async function leer(foto: Blob) {
  const bmp = await createImageBitmap(foto)
  const l = crearLienzo(bmp.width, bmp.height)
  l.ctx.drawImage(bmp, 0, 0)
  bmp.close()
  return l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height)
}

function alfaDe(imagen: ImageData) {
  const alfa = new Uint8Array(imagen.data.length / 4)
  for (let i = 0; i < alfa.length; i++) alfa[i] = imagen.data[i * 4 + 3]
  return alfa
}

/** Si tiene transparencia, es decir, si ya se le quitó el fondo. */
function esRecorte({ data }: ImageData) {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 10) return true
  return false
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
