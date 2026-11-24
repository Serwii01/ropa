/**
 * Procesado de imagen, todo en el navegador y en segundo plano (imagen.worker.ts → procesado.ts),
 * para que la pantalla no se congele. Aquí solo está el puente.
 */
import type { Categoria } from './categorias'
import type { Operaciones, Progreso, Recorte } from './procesado'
import type { Vec } from './retoque'

export type { Recorte }

/** No se ha encontrado ninguna prenda en la foto. */
export class SinPrenda extends Error {}

export type Peticion = { id: number; op: keyof Operaciones; args: unknown[] }
export type Respuesta =
  | { id: number; progreso: Parameters<Progreso> }
  | { id: number; valor: unknown }
  | { id: number; error: string; sinPrenda: boolean }

interface Pendiente {
  ok: (v: never) => void
  mal: (e: Error) => void
  progreso?: Progreso
}

let obrero: Worker | null = null
let siguiente = 0
const pendientes = new Map<number, Pendiente>()

function arrancar() {
  const w = new Worker(new URL('./imagen.worker.ts', import.meta.url), { type: 'module' })
  w.onmessage = ({ data }: MessageEvent<Respuesta>) => {
    const p = pendientes.get(data.id)
    if (!p) return
    if ('progreso' in data) return p.progreso?.(...data.progreso)
    pendientes.delete(data.id)
    if ('valor' in data) p.ok(data.valor as never)
    else p.mal(data.sinPrenda ? new SinPrenda() : new Error(data.error))
  }
  // No se pudo cargar o se quedó sin memoria: la próxima vez se empieza de cero
  w.onerror = () => {
    w.terminate()
    if (obrero === w) obrero = null
    for (const p of pendientes.values()) p.mal(new Error('No se pudo procesar la imagen.'))
    pendientes.clear()
  }
  return w
}

function pedir<K extends keyof Operaciones>(op: K, args: Parameters<Operaciones[K]>, progreso?: Progreso) {
  return new Promise<Awaited<ReturnType<Operaciones[K]>>>((ok, mal) => {
    obrero ??= arrancar()
    const id = ++siguiente
    pendientes.set(id, { ok, mal, progreso })
    obrero.postMessage({ id, op, args } satisfies Peticion)
  })
}

/** Recorta la prenda. `arriba`: inclinación del móvil al hacer la foto, si se conoce. */
export const quitarFondo = (foto: Blob, arriba: Vec | null, progreso?: Progreso): Promise<Recorte> =>
  pedir('quitarFondo', [foto, arriba], progreso)

/** Versión para guardar: ajustada al contorno o, si se da el tipo, encuadrada como las de ese tipo. */
export const terminar = (recorte: Blob, categoria: Categoria | null) => pedir('terminar', [recorte, categoria])

export const comprimirConFondo = (foto: Blob) => pedir('comprimirConFondo', [foto])

/** Retoca una foto ya guardada; null si ya estaba igualada. */
export const igualar = (foto: Blob, categoria: Categoria, progreso?: Progreso) =>
  pedir('igualar', [foto, categoria], progreso)

/** Si la foto estaba encuadrada para `antes`, la encuadra para `ahora`; si no, null. */
export const reencuadrar = (foto: Blob, antes: Categoria, ahora: Categoria) => pedir('reencuadrar', [foto, antes, ahora])

export const kb = (b: Blob) => `${Math.max(1, Math.round(b.size / 1024))} KB`
