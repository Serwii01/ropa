/** Capas de una combinación: cada prenda ocupa una según su categoría. */
export type Capa = 'exterior' | 'superior' | 'inferior' | 'calzado' | 'accesorio'

export const CAPAS: { id: Capa; label: string }[] = [
  { id: 'superior', label: 'Arriba' },
  { id: 'exterior', label: 'Encima' },
  { id: 'inferior', label: 'Abajo' },
  { id: 'calzado', label: 'Calzado' },
  { id: 'accesorio', label: 'Accesorio' },
]

export const CATEGORIAS = [
  { id: 'camiseta', label: 'Camiseta', capa: 'superior' },
  { id: 'camisa', label: 'Camisa', capa: 'superior' },
  { id: 'top', label: 'Top', capa: 'superior' },
  { id: 'sudadera', label: 'Sudadera', capa: 'superior' },
  { id: 'jersey', label: 'Jersey', capa: 'superior' },
  { id: 'vestido', label: 'Vestido', capa: 'superior' },
  { id: 'chaqueta', label: 'Chaqueta', capa: 'exterior' },
  { id: 'abrigo', label: 'Abrigo', capa: 'exterior' },
  { id: 'pantalon', label: 'Pantalón', capa: 'inferior' },
  { id: 'vaqueros', label: 'Vaqueros', capa: 'inferior' },
  { id: 'falda', label: 'Falda', capa: 'inferior' },
  { id: 'shorts', label: 'Shorts', capa: 'inferior' },
  { id: 'zapatillas', label: 'Zapatillas', capa: 'calzado' },
  { id: 'zapatos', label: 'Zapatos', capa: 'calzado' },
  { id: 'botas', label: 'Botas', capa: 'calzado' },
  { id: 'gorra', label: 'Gorra', capa: 'accesorio' },
  { id: 'bolso', label: 'Bolso', capa: 'accesorio' },
  { id: 'accesorio', label: 'Accesorio', capa: 'accesorio' },
] as const satisfies readonly { id: string; label: string; capa: Capa }[]

export type Categoria = (typeof CATEGORIAS)[number]['id']

const porId = new Map<string, (typeof CATEGORIAS)[number]>(CATEGORIAS.map((c) => [c.id, c]))

export const etiqueta = (c: string) => porId.get(c)?.label ?? c
export const capaDe = (c: string): Capa => porId.get(c)?.capa ?? 'accesorio'
