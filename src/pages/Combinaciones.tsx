import { Link, useViewTransitionState } from 'react-router-dom'
import type { Outfit, Prenda } from '../lib/api'
import { Flatlay } from '../components/Flatlay'
import { IconMas } from '../components/Icons'
import { useArmario } from '../lib/store'

export function Combinaciones() {
  const { outfits, prendas, cargando } = useArmario()
  const porId = new Map(prendas.map((p) => [p.id, p]))

  return (
    <>
      <div className="titulo-seccion">
        <h1>Combinaciones</h1>
        <span className="sutil">{outfits.length}</span>
      </div>

      {cargando ? (
        <div className="rejilla">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="tarjeta esqueleto alto" />)}
        </div>
      ) : outfits.length === 0 ? (
        <div className="vacio">
          <p>Aún no has creado combinaciones.</p>
          <p className="sutil">
            {prendas.length < 2 ? 'Añade algunas prendas primero.' : 'Mezcla prendas y guarda las que te gusten.'}
          </p>
          {prendas.length >= 2 && <Link to="/combinaciones/nueva" viewTransition className="btn primario">Crear combinación</Link>}
        </div>
      ) : (
        <div className="rejilla">
          {outfits.map((o) => (
            <Tarjeta key={o.id} outfit={o} prendas={o.prenda_ids.flatMap((id) => porId.get(id) ?? [])} />
          ))}
        </div>
      )}

      {prendas.length > 0 && (
        <Link to="/combinaciones/nueva" viewTransition className="fab" aria-label="Nueva combinación">
          <IconMas />
        </Link>
      )}
    </>
  )
}

function Tarjeta({ outfit, prendas }: { outfit: Outfit; prendas: Prenda[] }) {
  const ruta = `/combinaciones/${outfit.id}`
  const vuela = useViewTransitionState(ruta)
  return (
    <Link to={ruta} viewTransition className="tarjeta">
      <Flatlay prendas={prendas} style={vuela ? { viewTransitionName: 'foto-combinacion' } : undefined} />
      {outfit.nombre && (
        <div className="tarjeta-pie">
          <span className="tarjeta-nombre">{outfit.nombre}</span>
        </div>
      )}
    </Link>
  )
}
