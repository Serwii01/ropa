import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIAS, etiqueta, type Categoria } from '../lib/categorias'
import { useArmario } from '../lib/store'
import { IconMas } from '../components/Icons'

export function Armario() {
  const { prendas, cargando, error, recargar } = useArmario()
  const [filtro, setFiltro] = useState<Categoria | 'todas'>('todas')

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
          <button className={`chip ${filtro === 'todas' ? 'activo' : ''}`} onClick={() => setFiltro('todas')}>
            Todas
          </button>
          {presentes.map((c) => (
            <button key={c.id} className={`chip ${filtro === c.id ? 'activo' : ''}`} onClick={() => setFiltro(c.id)}>
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
          <Link to="/nueva" className="btn primario">Añadir prenda</Link>
        </div>
      ) : (
        <div className="rejilla">
          {visibles.map((p) => (
            <Link key={p.id} to={`/prenda/${p.id}`} className="tarjeta">
              <div className="lienzo">
                <img src={p.url} alt={p.nombre ?? etiqueta(p.categoria)} loading="lazy" />
              </div>
              <div className="tarjeta-pie">
                <span className="tarjeta-nombre">{p.nombre ?? etiqueta(p.categoria)}</span>
                {p.nombre && <span className="sutil">{etiqueta(p.categoria)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link to="/nueva" className="fab" aria-label="Añadir prenda">
        <IconMas />
      </Link>
    </>
  )
}
