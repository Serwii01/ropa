import type { Peticion, Respuesta } from './image'
import { operaciones, SinPrendaError, type Progreso } from './procesado'

const yo = self as unknown as {
  onmessage: (e: MessageEvent<Peticion>) => void
  postMessage: (r: Respuesta) => void
}

// De una en una: el modelo no admite dos a la vez y la memoria del móvil tampoco
let cola: Promise<unknown> = Promise.resolve()

yo.onmessage = ({ data: { id, op, args } }) => {
  cola = cola.then(async () => {
    const progreso: Progreso = (...p) => yo.postMessage({ id, progreso: p })
    try {
      const f = operaciones(progreso)[op] as (...a: unknown[]) => Promise<unknown>
      yo.postMessage({ id, valor: await f(...args) })
    } catch (e) {
      console.error(e)
      yo.postMessage({ id, error: e instanceof Error ? e.message : String(e), sinPrenda: e instanceof SinPrendaError })
    }
  })
}
