import type { Prenda } from '../lib/api'
import { capaDe, type Capa } from '../lib/categorias'

/** Composición tipo "flat lay": cada capa tiene su hueco en el lienzo. */
export function Flatlay({ prendas, className = '' }: { prendas: Prenda[]; className?: string }) {
  const porCapa = new Map<Capa, Prenda>()
  for (const p of prendas) {
    const capa = capaDe(p.categoria)
    if (!porCapa.has(capa)) porCapa.set(capa, p)
  }
  const sinExterior = !porCapa.has('exterior')

  return (
    <div className={`flatlay ${sinExterior ? 'sin-exterior' : ''} ${className}`}>
      {(['exterior', 'superior', 'inferior', 'calzado', 'accesorio'] as Capa[]).map((capa) => {
        const p = porCapa.get(capa)
        return p ? <img key={capa} className={`hueco ${capa}`} src={p.url} alt={p.nombre ?? ''} draggable={false} /> : null
      })}
      {prendas.length === 0 && <span className="flatlay-vacio">Elige prendas abajo</span>}
    </div>
  )
}
