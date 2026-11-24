/**
 * Retoque para que todas las prendas se vean parecidas. Solo cálculo, sin DOM.
 * Principio: ante la duda no se toca; es peor cambiarle el color a una prenda que dejarla como está.
 */

export type Vec = readonly [number, number, number]

// ─── Color ──────────────────────────────────────────────────
const LINEAL = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})
const aSrgb = (x: number) => 255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055)

/** Luminosidad (0–1) y croma perceptuales (OKLab) de un color lineal. */
function oklab(r: number, g: number, b: number) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, C: Math.hypot(a, bb) }
}

const mediana = (xs: number[]) => percentil(xs, 0.5)
function percentil(xs: number[], p: number) {
  const o = [...xs].sort((a, b) => a - b)
  return o[Math.min(o.length - 1, Math.floor(o.length * p))]
}
const acotar = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

/** Corrección de luz: ganancia por canal y degradado (en logaritmo, de -1 a 1 en cada eje). */
export interface Luz {
  rgb: Vec
  dx: number
  dy: number
  /** El fondo servía de referencia: no hace falta adivinar más mirando la prenda. */
  fiable: boolean
}

export const SIN_LUZ: Luz = { rgb: [1, 1, 1], dx: 0, dy: 0, fiable: false }

/**
 * Deduce la luz de la escena mirando el fondo, que suele ser una superficie uniforme:
 * - si es casi gris, su tinte es el de la luz (bombilla cálida, sombra azulada);
 * - si se aclara hacia un lado, la prenda también.
 */
export function luzDelFondo(rgba: Uint8ClampedArray, alfa: Uint8Array, w: number, h: number): Luz {
  const r: number[] = [], g: number[] = [], b: number[] = []
  const px: number[] = [], py: number[] = [], logs: number[] = []
  const cuadrantes = [0, 0, 0, 0]
  const paso = Math.max(1, Math.round(Math.max(w, h) / 160))
  let muestras = 0
  for (let y = 0; y < h; y += paso) {
    for (let x = 0; x < w; x += paso) {
      muestras++
      const i = y * w + x
      if (alfa[i] > 0) continue
      const R = LINEAL[rgba[i * 4]], G = LINEAL[rgba[i * 4 + 1]], B = LINEAL[rgba[i * 4 + 2]]
      r.push(R)
      g.push(G)
      b.push(B)
      const X = (2 * x) / w - 1, Y = (2 * y) / h - 1
      px.push(X)
      py.push(Y)
      logs.push(Math.log(0.2126 * R + 0.7152 * G + 0.0722 * B + 0.004))
      cuadrantes[(X > 0 ? 1 : 0) + (Y > 0 ? 2 : 0)]++
    }
  }
  if (r.length < muestras * 0.08) return SIN_LUZ

  let dx = 0, dy = 0
  if (Math.min(...cuadrantes) > r.length * 0.08) {
    ;[dx, dy] = plano(px, py, logs)
    dx = acotar(dx, -0.3, 0.3)
    dy = acotar(dy, -0.3, 0.3)
  }

  const m: Vec = [mediana(r), mediana(g), mediana(b)]
  const { L, C } = oklab(...m)
  let rgb: Vec = [1, 1, 1]
  // Un suelo de madera también es cálido: solo se corrige si el tinte es leve, y cada vez menos al crecer
  const confianza = L > 0.35 ? acotar((0.075 - C / L) / 0.02, 0, 1) * 0.85 : 0
  if (confianza > 0) {
    const gris = 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]
    // Sobre una superficie clara y neutra, subir hasta que se vea clara de verdad
    const expo = L > 0.72 && L < 0.92 ? Math.min(1.35, (0.92 / L) ** 3) : 1
    const canal = (c: number) => acotar(1 + (gris / c - 1) * confianza, 0.75, 1.35) * (1 + (expo - 1) * confianza)
    rgb = [canal(m[0]), canal(m[1]), canal(m[2])]
  }
  return { rgb, dx, dy, fiable: confianza > 0.6 && L > 0.72 }
}

/** Pendientes del plano que mejor ajusta z, descartando dos veces lo que se aleja (sombras, objetos). */
function plano(x: number[], y: number[], z: number[]): [number, number] {
  let idx = x.map((_, i) => i)
  let a = 0, b = 0, c = 0
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    let n = 0, sx = 0, sy = 0, sz = 0, xx = 0, yy = 0, xy = 0, xz = 0, yz = 0
    for (const i of idx) {
      n++
      sx += x[i]; sy += y[i]; sz += z[i]
      xx += x[i] * x[i]; yy += y[i] * y[i]; xy += x[i] * y[i]
      xz += x[i] * z[i]; yz += y[i] * z[i]
    }
    const cxx = xx - (sx * sx) / n, cyy = yy - (sy * sy) / n, cxy = xy - (sx * sy) / n
    const cxz = xz - (sx * sz) / n, cyz = yz - (sy * sz) / n
    const det = cxx * cyy - cxy * cxy
    if (Math.abs(det) < 1e-9) return [0, 0]
    a = (cxz * cyy - cyz * cxy) / det
    b = (cyz * cxx - cxz * cxy) / det
    c = (sz - a * sx - b * sy) / n
    if (vuelta === 2) break
    const res = idx.map((i) => Math.abs(z[i] - a * x[i] - b * y[i] - c))
    const corte = percentil(res, 0.8)
    idx = idx.filter((_, k) => res[k] <= corte)
  }
  return [a, b]
}

/**
 * Aplica la luz y acaba de ajustar según la prenda: el blanco que la cámara dejó gris se aclara y
 * el negro sin detalle se levanta un poco. Los tonos medios no se tocan: ahí no hay forma de saber
 * si una prenda es oscura o la foto lo es. Devuelve si ha cambiado algo.
 */
export function aplicarLuz(rgba: Uint8ClampedArray, alfa: Uint8Array, w: number, h: number, luz: Luz) {
  const Ls: number[] = [], Cs: number[] = []
  const paso = Math.max(1, Math.round(Math.max(w, h) / 200))
  for (let y = 0; y < h; y += paso) {
    for (let x = 0; x < w; x += paso) {
      const i = y * w + x
      if (alfa[i] < 245) continue
      const f = Math.exp(-luz.dx * ((2 * x) / w - 1) - luz.dy * ((2 * y) / h - 1))
      const { L, C } = oklab(
        LINEAL[rgba[i * 4]] * luz.rgb[0] * f,
        LINEAL[rgba[i * 4 + 1]] * luz.rgb[1] * f,
        LINEAL[rgba[i * 4 + 2]] * luz.rgb[2] * f,
      )
      Ls.push(L)
      Cs.push(C)
    }
  }
  if (!Ls.length) return false
  const L50 = mediana(Ls), L90 = percentil(Ls, 0.9), C50 = mediana(Cs)
  let expo = 1
  if (!luz.fiable && L50 > 0.79 && L90 < 0.95) {
    // Rampas: ni un gris claro (0,79) ni un crudo o beige (croma 0,03) se toman por blanco apagado
    expo = 1 + ((0.95 / L90) ** 3 - 1) * acotar((L50 - 0.79) / 0.05, 0, 1) * acotar((0.03 - C50) / 0.012, 0, 1)
  } else if (L50 < 0.22) {
    expo = Math.min(1.6, (0.22 / Math.max(L50, 0.05)) ** 3)
  }
  const rgb = luz.rgb.map((c) => c * expo)
  if (rgb.every((c) => Math.abs(c - 1) < 0.01) && Math.abs(luz.dx) + Math.abs(luz.dy) < 0.02) return false

  for (let y = 0; y < h; y++) {
    const fy = Math.exp(-luz.dy * ((2 * y) / h - 1))
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!alfa[i]) continue
      const f = fy * Math.exp(-luz.dx * ((2 * x) / w - 1))
      for (let c = 0; c < 3; c++) {
        const k = i * 4 + c
        const antes = LINEAL[rgba[k]]
        let v = antes * rgb[c] * f
        // Las luces altas se comprimen en vez de quemarse
        if (v > 0.8 && v > antes) v = Math.max(antes, 0.8 + 0.2 * Math.tanh((v - 0.8) / 0.2))
        rgba[k] = aSrgb(Math.min(1, v))
      }
    }
  }
  return true
}

// ─── Giro ───────────────────────────────────────────────────
/**
 * Grados que hay que girar la imagen (positivo: sentido horario, como canvas) para que la prenda
 * quede derecha: la ropa es casi simétrica, así que se busca el giro que más la iguala a su reflejo.
 */
export function giroRecto(alfa: Uint8Array, w: number, h: number): number {
  const N = 128
  const e = Math.max(w, h) / N
  const pts: number[] = []
  let cx = 0, cy = 0
  for (let y = 0; y < Math.floor(h / e); y++) {
    for (let x = 0; x < Math.floor(w / e); x++) {
      if (alfa[Math.floor((y + 0.5) * e) * w + Math.floor((x + 0.5) * e)] < 128) continue
      pts.push(x, y)
      cx += x
      cy += y
    }
  }
  const n = pts.length / 2
  if (n < 200) return 0
  cx /= n
  cy /= n
  const R = Math.ceil(N * 0.75)
  const lado = 2 * R + 1
  const malla = new Uint8Array(lado * lado)
  for (let k = 0; k < pts.length; k += 2) {
    malla[Math.round(pts[k + 1] - cy + R) * lado + Math.round(pts[k] - cx + R)] = 1
  }
  // Reflejar respecto a un eje inclinado `g` grados, probando también a desplazarlo un poco
  const simetria = (g: number) => {
    const t = (g * Math.PI) / 180
    const ux = Math.cos(t), uy = Math.sin(t) // dirección perpendicular al eje
    let mejor = 0
    for (let d = -4; d <= 4; d++) {
      let dentro = 0
      for (let k = 0; k < pts.length; k += 2) {
        const x = pts[k] - cx, y = pts[k + 1] - cy
        const p = 2 * (x * ux + y * uy - d)
        const X = Math.round(x - p * ux + R), Y = Math.round(y - p * uy + R)
        if (X >= 0 && Y >= 0 && X < lado && Y < lado && malla[Y * lado + X]) dentro++
      }
      mejor = Math.max(mejor, dentro / n)
    }
    return mejor
  }
  const base = simetria(0)
  let g = 0, s = base
  for (let a = -24; a <= 24; a += 2) {
    const v = simetria(a)
    if (v > s) [g, s] = [a, v]
  }
  const centro = g
  for (let a = centro - 1.5; a <= centro + 1.5; a += 0.5) {
    const v = simetria(a)
    if (v > s) [g, s] = [a, v]
  }
  // En el límite del rango, poco simétrica o sin mejora clara: no hay seguridad
  if (Math.abs(g) < 1 || Math.abs(g) >= 24 || s < 0.86 || s - base < 0.008) return 0
  return -g
}

// ─── Perspectiva ────────────────────────────────────────────
/** Dirección «arriba» vista desde el móvil (x derecha, y parte alta, z hacia quien mira). */
export function arribaDelMovil(beta: number, gamma: number): Vec {
  const b = (beta * Math.PI) / 180, g = (gamma * Math.PI) / 180
  return [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)]
}

/** Distancia focal aproximada de la cámara principal de un móvil, en diagonales de la imagen. */
const FOCAL = 0.65

/**
 * Matriz 3×3 (por filas) que lleva cada píxel de la imagen corregida al de la original, como si el
 * móvil hubiera estado paralelo a la prenda (tumbada o colgada). null si no hace falta o no es fiable.
 */
export function correccionPerspectiva(arriba: Vec, w: number, h: number): number[] | null {
  const [, y, z] = arriba
  // Perpendicular a la prenda: la vertical si está tumbada; si cuelga, solo se conoce el cabeceo
  const n: Vec = z > 0.7 ? arriba : Math.abs(z) < 0.5 && y > 0.7 ? normal([0, -z, y]) : [0, 0, 1]
  const grados = (Math.acos(acotar(n[2], -1, 1)) * 180) / Math.PI
  if (grados < 2 || grados > 30) return null
  // Giro mínimo que lleva el eje z (la cámara recta) a n: de rayo corregido a rayo original
  const [a, b, c] = n
  const k = 1 / (1 + c)
  const R = [1 - a * a * k, -a * b * k, a, -a * b * k, 1 - b * b * k, b, -a, -b, c]
  const f = FOCAL * Math.hypot(w, h)
  // Rayo de un píxel: ((px - w/2)/f, -(py - h/2)/f, -1)
  const rayo = [1 / f, 0, -w / 2 / f, 0, -1 / f, h / 2 / f, 0, 0, -1]
  const aPixel = [-f, 0, w / 2, 0, f, h / 2, 0, 0, 1] // sobre (X/Z, Y/Z, 1)
  const M = mul(aPixel, mul(R, rayo))
  // Se vuelve a centrar: girar la cámara desplaza la imagen y la prenda se saldría
  const o = proyectar(inversa(M), w / 2, h / 2)
  return mul(M, [1, 0, o[0] - w / 2, 0, 1, o[1] - h / 2, 0, 0, 1])
}

function normal(v: Vec): Vec {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l]
}
export const mul = (a: number[], b: number[]) =>
  Array.from({ length: 9 }, (_, i) => {
    const f = Math.floor(i / 3) * 3, c = i % 3
    return a[f] * b[c] + a[f + 1] * b[c + 3] + a[f + 2] * b[c + 6]
  })
export function inversa(m: number[]) {
  const [a, b, c, d, e, f, g, h, i] = m
  return [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d]
}
export function proyectar(m: number[], x: number, y: number): [number, number] {
  const z = m[6] * x + m[7] * y + m[8]
  return [(m[0] * x + m[1] * y + m[2]) / z, (m[3] * x + m[4] * y + m[5]) / z]
}

/**
 * Aplica la matriz con interpolación bilineal, pesando el color por su alfa para que el de los
 * píxeles transparentes no manche el borde. Fuera de la imagen es transparente.
 */
export function deformar(src: Uint8ClampedArray, w: number, h: number, M: number[], W: number, H: number) {
  const dst = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [u, v] = proyectar(M, x, y)
      const x0 = Math.floor(u), y0 = Math.floor(v)
      const fx = u - x0, fy = v - y0
      let r = 0, g = 0, b = 0, a = 0
      for (let k = 0; k < 4; k++) {
        const px = x0 + (k & 1), py = y0 + (k >> 1)
        if (px < 0 || py < 0 || px >= w || py >= h) continue
        const i = (py * w + px) * 4
        const p = (k & 1 ? fx : 1 - fx) * (k >> 1 ? fy : 1 - fy) * src[i + 3]
        r += src[i] * p
        g += src[i + 1] * p
        b += src[i + 2] * p
        a += p
      }
      if (!a) continue
      const d = (y * W + x) * 4
      dst[d] = r / a
      dst[d + 1] = g / a
      dst[d + 2] = b / a
      dst[d + 3] = a
    }
  }
  return dst
}

// ─── Tamaño ─────────────────────────────────────────────────
/**
 * Ancho típico (px) de la prenda entre dos alturas (0–1), contando solo el tramo continuo más
 * largo de cada fila: así las mangas separadas del cuerpo no cuentan.
 */
export function anchoEntre(alfa: Uint8Array, w: number, h: number, desde: number, hasta: number) {
  const anchos: number[] = []
  for (let y = Math.floor(h * desde); y < Math.min(h, Math.ceil(h * hasta)); y++) {
    let mejor = 0, racha = 0
    for (let x = 0; x < w; x++) {
      racha = alfa[y * w + x] >= 128 ? racha + 1 : 0
      if (racha > mejor) mejor = racha
    }
    if (mejor) anchos.push(mejor)
  }
  return anchos.length ? mediana(anchos) : 0
}
