import type { CSSProperties } from 'react'
import type { Prenda } from '../lib/api'
import { cajaEnCombinacion, capaDe, type Capa } from '../lib/categorias'
import { Foto } from './Foto'

// Centro horizontal de cada capa, en % del lienzo. Calzado y accesorio tienen hueco fijo en styles.css.
const CENTRO: Partial<Record<Capa, [conExterior: number, sinExterior: number]>> = {
  exterior: [70, 70],
  superior: [36, 50],
  inferior: [46, 48],
}

/** Composición tipo "flat lay": cada capa tiene su hueco en el lienzo. */
export function Flatlay({ prendas, className = '', style }: { prendas: Prenda[]; className?: string; style?: CSSProperties }) {
  const porCapa = new Map<Capa, Prenda>()
  for (const p of prendas) {
    const capa = capaDe(p.categoria)
    if (!porCapa.has(capa)) porCapa.set(capa, p)
  }
  const sinExterior = !porCapa.has('exterior')

  function hueco(capa: Capa, categoria: string): CSSProperties | undefined {
    const centro = CENTRO[capa]?.[sinExterior ? 1 : 0]
    if (centro == null) return
    const { w, h } = cajaEnCombinacion(categoria)
    return { width: `${w}%`, height: `${h}%`, left: `${centro - w / 2}%` }
  }

  return (
    <div className={`flatlay ${sinExterior ? 'sin-exterior' : ''} ${className}`} style={style}>
      {(['exterior', 'superior', 'inferior', 'calzado', 'accesorio'] as Capa[]).map((capa) => {
        const p = porCapa.get(capa)
        return p ? <Foto key={p.id} className={`hueco ${capa}`} style={hueco(capa, p.categoria)} src={p.url} alt={p.nombre ?? ''} draggable={false} /> : null
      })}
      {prendas.length === 0 && <span className="flatlay-vacio">Elige prendas abajo</span>}
    </div>
  )
}
