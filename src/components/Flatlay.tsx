import type { CSSProperties } from 'react'
import type { Prenda } from '../lib/api'
import { cajaEnCombinacion, CAPAS_ARRIBA, capaDe, type Capa } from '../lib/categorias'
import { Foto } from './Foto'

// Centro horizontal (% del lienzo) de las prendas de arriba, de dentro afuera, según cuántas haya:
// en abanico, con la interior delante. Calzado y accesorio tienen hueco fijo en styles.css.
const ABANICO = [[50], [36, 70], [30, 50, 71], [28, 43, 58, 73], [27, 39, 50, 61, 73]]

/** Composición tipo "flat lay": cada capa tiene su hueco en el lienzo. */
export function Flatlay({ prendas, className = '', style }: { prendas: Prenda[]; className?: string; style?: CSSProperties }) {
  const porCapa = new Map<Capa, Prenda>()
  for (const p of prendas) {
    const capa = capaDe(p.categoria)
    if (!porCapa.has(capa)) porCapa.set(capa, p)
  }
  const arriba = CAPAS_ARRIBA.filter((c) => porCapa.has(c))

  function hueco(capa: Capa, categoria: string): CSSProperties | undefined {
    const { w, h } = cajaEnCombinacion(categoria)
    const caja = (centro: number) => ({ width: `${w}%`, height: `${h}%`, left: `${centro - w / 2}%` })
    if (capa === 'inferior') return caja(arriba.length > 1 ? 46 : 48)
    const i = arriba.indexOf(capa)
    if (i < 0) return
    // La interior, delante de todo; las demás, detrás también del pantalón (z-index 5)
    return { ...caja(ABANICO[arriba.length - 1][i]), top: `${7 - Math.min(i, 3)}%`, zIndex: i ? 5 - i : 10 }
  }

  return (
    <div className={`flatlay ${className}`} style={style}>
      {([...arriba].reverse().concat('inferior', 'calzado', 'accesorio')).map((capa) => {
        const p = porCapa.get(capa)
        return p ? <Foto key={p.id} className={`hueco ${arriba.includes(capa) ? 'arriba' : capa}`} style={hueco(capa, p.categoria)} src={p.url} alt={p.nombre ?? ''} draggable={false} /> : null
      })}
      {prendas.length === 0 && <span className="flatlay-vacio">Elige prendas abajo</span>}
    </div>
  )
}
