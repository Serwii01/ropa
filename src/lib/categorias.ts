/** Capas de una combinación: cada prenda ocupa una según su categoría. */
export type Capa = 'exterior' | 'superior' | 'inferior' | 'calzado' | 'accesorio'

export const CAPAS: { id: Capa; label: string }[] = [
  { id: 'superior', label: 'Arriba' },
  { id: 'exterior', label: 'Encima' },
  { id: 'inferior', label: 'Abajo' },
  { id: 'calzado', label: 'Calzado' },
  { id: 'accesorio', label: 'Accesorio' },
]

/** `cm`: ancho y alto aproximados de la prenda extendida; dan la proporción entre unas y otras. */
export const CATEGORIAS = [
  { id: 'camiseta', label: 'Camiseta', capa: 'superior', cm: [75, 72] },
  { id: 'camisa', label: 'Camisa', capa: 'superior', cm: [75, 76] },
  { id: 'top', label: 'Top', capa: 'superior', cm: [50, 50] },
  { id: 'sudadera', label: 'Sudadera', capa: 'superior', cm: [80, 72] },
  { id: 'jersey', label: 'Jersey', capa: 'superior', cm: [80, 70] },
  { id: 'vestido', label: 'Vestido', capa: 'superior', cm: [65, 110] },
  { id: 'chaqueta', label: 'Chaqueta', capa: 'exterior', cm: [82, 72] },
  { id: 'abrigo', label: 'Abrigo', capa: 'exterior', cm: [82, 108] },
  { id: 'pantalon', label: 'Pantalón', capa: 'inferior', cm: [52, 105] },
  { id: 'vaqueros', label: 'Vaqueros', capa: 'inferior', cm: [52, 105] },
  { id: 'falda', label: 'Falda', capa: 'inferior', cm: [58, 65] },
  { id: 'shorts', label: 'Shorts', capa: 'inferior', cm: [58, 50] },
  { id: 'zapatillas', label: 'Zapatillas', capa: 'calzado', cm: [32, 32] },
  { id: 'zapatos', label: 'Zapatos', capa: 'calzado', cm: [32, 32] },
  { id: 'botas', label: 'Botas', capa: 'calzado', cm: [34, 42] },
  { id: 'gorra', label: 'Gorra', capa: 'accesorio', cm: [28, 28] },
  { id: 'bolso', label: 'Bolso', capa: 'accesorio', cm: [40, 40] },
  { id: 'accesorio', label: 'Accesorio', capa: 'accesorio', cm: [30, 30] },
] as const satisfies readonly { id: string; label: string; capa: Capa; cm: readonly [number, number] }[]

export type Categoria = (typeof CATEGORIAS)[number]['id']

const porId = new Map<string, (typeof CATEGORIAS)[number]>(CATEGORIAS.map((c) => [c.id, c]))

export const etiqueta = (c: string) => porId.get(c)?.label ?? c
export const capaDe = (c: string): Capa => porId.get(c)?.capa ?? 'accesorio'

const cmDe = (c: string): readonly [number, number] => porId.get(c)?.cm ?? [30, 30]

type Cuerpo = { ancho: number; desde: number; hasta: number }
const torso = (ancho: number): Cuerpo => ({ ancho, desde: 0.6, hasta: 0.85 })
const cintura = (ancho: number): Cuerpo => ({ ancho, desde: 0.03, hasta: 0.1 })
/** Ancho típico del cuerpo (cm) y a qué altura de la prenda se mide. */
const CUERPO: Partial<Record<Categoria, Cuerpo>> = {
  camiseta: torso(50),
  camisa: torso(53),
  top: torso(42),
  sudadera: torso(55),
  jersey: torso(54),
  chaqueta: torso(56),
  abrigo: torso(58),
  vestido: { ancho: 40, desde: 0.3, hasta: 0.42 },
  pantalon: cintura(40),
  vaqueros: cintura(40),
  shorts: cintura(42),
  falda: cintura(38),
}

export function cuerpoDe(c: Categoria) {
  const cuerpo = CUERPO[c]
  return cuerpo && { ...cuerpo, cm: cmDe(c) }
}

/** Tamaño en el lienzo de una combinación (3:4): todas a la misma escala. En % del lienzo. */
export function cajaEnCombinacion(c: string) {
  const [w, h] = cmDe(c)
  return { w: w * 0.56, h: h * 0.56 * 0.75 }
}

/** Tamaño en una tarjeta: las pequeñas se ven más pequeñas, pero suavizado para que no queden diminutas. */
export function cajaEnTarjeta(c: string) {
  const [w, h] = cmDe(c)
  const proporcion = 1.35 // alto / ancho del interior de la tarjeta
  const u = Math.max(0.65, Math.sqrt(Math.max(w, h) / 110)) * Math.min(1 / w, proporcion / h)
  return { width: `${w * u * 100}%`, height: `${((h * u) / proporcion) * 100}%` }
}
