import type { Categoria } from './categorias'

/** Silueta de ayuda al hacer la foto, en un lienzo de 75×100 (3:4). */
export interface Plantilla {
  trazo: string
  /** Altura de la línea de referencia (hombros, cintura o suelo). */
  linea: number
  ayuda: string
}

const corta: Plantilla = {
  trazo: 'M29 20 Q37.5 27 46 20 L55 23 L68 38 L59 46 L54 41 V80 H21 V41 L16 46 L7 38 L20 23 Z',
  linea: 22,
  ayuda: 'Hombros en la línea y mangas a los lados',
}

const larga: Plantilla = {
  trazo: 'M29 18 Q37.5 24 46 18 L55 21 L61 32 L66 74 L58 75 L54 42 V80 H21 V42 L17 75 L9 74 L14 32 L20 21 Z',
  linea: 20,
  ayuda: 'Hombros en la línea y mangas hacia abajo',
}

const abrigo: Plantilla = {
  trazo: 'M30 8 Q37.5 13 45 8 L54 11 L59 21 L64 62 L57 63 L53 32 L56 93 H19 L22 32 L18 63 L11 62 L16 21 L21 11 Z',
  linea: 10,
  ayuda: 'Hombros en la línea y mangas hacia abajo',
}

const top: Plantilla = {
  trazo: 'M26 22 H30 Q31 36 37.5 37 Q44 36 45 22 H49 Q50 38 56 43 L54 77 H21 L19 43 Q25 38 26 22 Z',
  linea: 22,
  ayuda: 'Tirantes en la línea',
}

const vestido: Plantilla = {
  trazo: 'M28 8 Q37.5 15 47 8 L54 11 L60 22 L53 26 L50 23 L49 42 L60 92 H15 L26 42 L25 23 L22 26 L15 22 L21 11 Z',
  linea: 10,
  ayuda: 'Hombros en la línea y falda extendida',
}

const pantalon: Plantilla = {
  trazo: 'M24 6 H51 L56 94 H42 L37.5 37 L33 94 H19 Z',
  linea: 6,
  ayuda: 'Cintura en la línea y perneras rectas',
}

const shorts: Plantilla = {
  trazo: 'M18 26 H57 L64 72 H40 L37.5 48 L35 72 H11 Z',
  linea: 26,
  ayuda: 'Cintura en la línea y perneras rectas',
}

const falda: Plantilla = {
  trazo: 'M23 18 H52 L64 82 H11 Z',
  linea: 18,
  ayuda: 'Cintura en la línea',
}

const calzado: Plantilla = {
  trazo:
    'M27 18 Q35 20 34 40 Q32 52 34 66 Q34 82 24 82 Q14 82 15 66 Q17 52 14 40 Q15 18 27 18 Z ' +
    'M48 18 Q40 20 41 40 Q43 52 41 66 Q41 82 51 82 Q61 82 60 66 Q58 52 61 40 Q60 18 48 18 Z',
  linea: 82,
  ayuda: 'El par visto desde arriba, talones en la línea',
}

const suelto: Plantilla = {
  trazo: 'M19 22 H56 Q62 22 62 28 V72 Q62 78 56 78 H19 Q13 78 13 72 V28 Q13 22 19 22 Z',
  linea: 78,
  ayuda: 'Centrado y llenando el recuadro',
}

const PLANTILLAS: Record<Categoria, Plantilla> = {
  camiseta: corta,
  camisa: larga,
  top,
  sudadera: larga,
  jersey: larga,
  vestido,
  chaqueta: larga,
  chaqueton: larga,
  abrigo,
  pantalon,
  vaqueros: pantalon,
  falda,
  shorts,
  zapatillas: calzado,
  zapatos: calzado,
  botas: calzado,
  gorra: suelto,
  bolso: suelto,
  accesorio: suelto,
}

export const plantillaDe = (c: Categoria | null): Plantilla | null => (c ? PLANTILLAS[c] : null)
