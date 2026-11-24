/** Operaciones sobre la máscara (alfa 0–255) que devuelve el modelo. Sin DOM. */

export interface Caja { x: number; y: number; w: number; h: number }

const UMBRAL = 128

/** Etiqueta las zonas conectadas de los píxeles que cumplen `dentro`. */
function zonas(w: number, h: number, dentro: (i: number) => boolean) {
  const etiqueta = new Int32Array(w * h)
  const area = [0]
  const tocaBorde = [false]
  const pila: number[] = []
  for (let i = 0; i < etiqueta.length; i++) {
    if (etiqueta[i] || !dentro(i)) continue
    const n = area.length
    area.push(0)
    tocaBorde.push(false)
    etiqueta[i] = n
    pila.push(i)
    while (pila.length) {
      const j = pila.pop()!
      const x = j % w
      const y = (j - x) / w
      area[n]++
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tocaBorde[n] = true
      const visitar = (k: number) => {
        if (!etiqueta[k] && dentro(k)) {
          etiqueta[k] = n
          pila.push(k)
        }
      }
      if (x > 0) visitar(j - 1)
      if (x < w - 1) visitar(j + 1)
      if (y > 0) visitar(j - w)
      if (y < h - 1) visitar(j + w)
    }
  }
  return { etiqueta, area, tocaBorde }
}

/**
 * Limpia la máscara: quita manchas sueltas, tapa agujeros pequeños (estampados que el modelo toma
 * por fondo) y hace más firme el borde. Conserva piezas grandes separadas, como un par de zapatos.
 */
export function limpiarMascara(alfa: Uint8Array, w: number, h: number): Uint8Array {
  const visibles = zonas(w, h, (i) => alfa[i] >= 25)
  const mayor = Math.max(...visibles.area)
  const huecos = zonas(w, h, (i) => alfa[i] < UMBRAL)
  const limpia = new Uint8Array(alfa.length)
  for (let i = 0; i < alfa.length; i++) {
    const hueco = huecos.etiqueta[i]
    if (hueco && !huecos.tocaBorde[hueco] && huecos.area[hueco] < mayor * 0.01) {
      limpia[i] = 255
      continue
    }
    const zona = visibles.etiqueta[i]
    if (!zona || visibles.area[zona] < mayor * 0.1) continue
    limpia[i] = Math.max(0, Math.min(255, ((alfa[i] - 25) * 255) / 205))
  }
  return limpia
}

export function areaMascara(alfa: Uint8Array) {
  let n = 0
  for (const a of alfa) if (a >= UMBRAL) n++
  return n / alfa.length
}

/** Caja que contiene la prenda, o null si la máscara está vacía. */
export function cajaMascara(alfa: Uint8Array, w: number, h: number): Caja | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alfa[y * w + x] < 40) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Los píxeles semitransparentes del borde llevan mezclado el color del fondo (halo): se sustituye
 * por el de la prenda, extendiéndolo desde dentro.
 */
export function quitarHalo(rgba: Uint8ClampedArray, alfa: Uint8Array, w: number, h: number, pasos = 6) {
  const firme = new Uint8Array(alfa.length)
  for (let i = 0; i < alfa.length; i++) firme[i] = alfa[i] >= 245 ? 1 : 0
  for (let p = 0; p < pasos; p++) {
    const nuevos: number[] = []
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        if (firme[i] || !alfa[i]) continue
        let r = 0, g = 0, b = 0, n = 0
        for (const k of [i - 1, i + 1, i - w, i + w]) {
          if (!firme[k]) continue
          r += rgba[k * 4]
          g += rgba[k * 4 + 1]
          b += rgba[k * 4 + 2]
          n++
        }
        if (!n) continue
        rgba[i * 4] = r / n
        rgba[i * 4 + 1] = g / n
        rgba[i * 4 + 2] = b / n
        nuevos.push(i)
      }
    }
    if (!nuevos.length) break
    for (const i of nuevos) firme[i] = 1
  }
}
