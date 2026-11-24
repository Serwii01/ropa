import { useMemo, useRef, useState } from 'react'
import { Link, useViewTransitionState } from 'react-router-dom'
import type { Prenda } from '../lib/api'
import { CATEGORIAS, etiqueta, type Categoria } from '../lib/categorias'
import { useArmario } from '../lib/store'
import { useFlip } from '../lib/movimiento'
import { Foto } from '../components/Foto'
import { IconMas } from '../components/Icons'

export function Armario() {
  const { prendas, cargando, error, recargar } = useArmario()
  const [filtro, setFiltro] = useState<Categoria | 'todas'>('todas')
  const rejilla = useRef<HTMLDivElement>(null)
  const capturar = useFlip(rejilla, filtro)

  function filtrar(f: Categoria | 'todas') {
    capturar()
    setFiltro(f)
  }

  const presentes = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const p of prendas) cuenta.set(p.categoria, (cuenta.get(p.categoria) ?? 0) + 1)
    return CATEGORIAS.filter((c) => cuenta.has(c.id)).map((c) => ({ ...c, n: cuenta.get(c.id)! }))
  }, [prendas])

  const visibles = filtro === 'todas' ? prendas : prendas.filter((p) => p.categoria === filtro)

  return (
    <>
      <div className="titulo-seccion">
        <h1>Armario</h1>
        <span className="sutil">{prendas.length} {prendas.length === 1 ? 'prenda' : 'prendas'}</span>
      </div>

      {presentes.length > 1 && (
        <div className="chips desplazar">
          <button className={`chip ${filtro === 'todas' ? 'activo' : ''}`} onClick={() => filtrar('todas')}>
            Todas
          </button>
          {presentes.map((c) => (
            <button key={c.id} className={`chip ${filtro === c.id ? 'activo' : ''}`} onClick={() => filtrar(c.id)}>
              {c.label} <span className="chip-n">{c.n}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="aviso">
          {error} · <button className="enlace" onClick={recargar}>Reintentar</button>
        </p>
      )}

      {cargando ? (
        <div className="rejilla">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="tarjeta esqueleto" />)}
        </div>
      ) : prendas.length === 0 ? (
        <div className="vacio">
          <p>Tu armario está vacío.</p>
          <p className="sutil">Haz una foto a una prenda para empezar.</p>
          <Link to="/nueva" viewTransition className="btn primario">Añadir prenda</Link>
        </div>
      ) : (
        <div className="rejilla" ref={rejilla}>
          {visibles.map((p) => <Tarjeta key={p.id} prenda={p} />)}
        </div>
      )}

      <Link to="/nueva" viewTransition className="fab" aria-label="Añadir prenda">
        <IconMas />
      </Link>
    </>
  )
}

function Tarjeta({ prenda: p }: { prenda: Prenda }) {
  const ruta = `/prenda/${p.id}`
  const vuela = useViewTransitionState(ruta)
  return (
    <Link to={ruta} viewTransition className="tarjeta" data-flip={p.id}>
      <div className="lienzo" style={vuela ? { viewTransitionName: 'foto-prenda' } : undefined}>
        <Foto src={p.url} alt={p.nombre ?? etiqueta(p.categoria)} loading="lazy" />
      </div>
      <div className="tarjeta-pie">
        <span className="tarjeta-nombre">{p.nombre ?? etiqueta(p.categoria)}</span>
        {p.nombre && <span className="sutil">{etiqueta(p.categoria)}</span>}
      </div>
    </Link>
  )
}
