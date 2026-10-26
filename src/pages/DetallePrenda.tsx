import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Barra } from '../components/Layout'
import { FormPrenda, limpiar, type Borrador } from '../components/FormPrenda'
import { Flatlay } from '../components/Flatlay'
import { IconPapelera } from '../components/Icons'
import { actualizarPrenda, borrarPrenda } from '../lib/api'
import { etiqueta } from '../lib/categorias'
import { useArmario } from '../lib/store'

export function DetallePrenda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { prendas, outfits, setPrendas, setOutfits, cargando } = useArmario()
  const prenda = prendas.find((p) => p.id === id)

  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!prenda) {
    return (
      <>
        <Barra titulo="" />
        <p className="sutil centrado">{cargando ? 'Cargando…' : 'Esta prenda ya no existe.'}</p>
      </>
    )
  }

  const valor = borrador ?? { nombre: prenda.nombre, categoria: prenda.categoria, color: prenda.color, notas: prenda.notas }
  const enOutfits = outfits.filter((o) => o.prenda_ids.includes(prenda.id))

  async function guardar() {
    if (!borrador) return
    setOcupado(true)
    setError(null)
    try {
      const datos = limpiar(borrador)
      await actualizarPrenda(prenda!.id, datos)
      setPrendas((ps) => ps.map((p) => (p.id === prenda!.id ? { ...p, ...datos } : p)))
      setBorrador(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  async function borrar() {
    if (!confirm('¿Eliminar esta prenda? También se quitará de tus combinaciones.')) return
    setOcupado(true)
    try {
      await borrarPrenda(prenda!)
      setPrendas((ps) => ps.filter((p) => p.id !== prenda!.id))
      setOutfits((os) => os.map((o) => ({ ...o, prenda_ids: o.prenda_ids.filter((x) => x !== prenda!.id) })))
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setOcupado(false)
    }
  }

  return (
    <>
      <Barra titulo={prenda.nombre ?? etiqueta(prenda.categoria)}>
        <button className="icono-btn peligro" aria-label="Eliminar" onClick={borrar} disabled={ocupado}>
          <IconPapelera />
        </button>
      </Barra>
      <div className="pila">
        <div className="vista-previa">
          <img src={prenda.url} alt={prenda.nombre ?? ''} />
        </div>

        <FormPrenda valor={valor} onChange={setBorrador} />
        {error && <p className="aviso">{error}</p>}
        {borrador && (
          <button className="btn primario ancho" onClick={guardar} disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}

        {enOutfits.length > 0 && (
          <section>
            <h2 className="subtitulo">En {enOutfits.length} {enOutfits.length === 1 ? 'combinación' : 'combinaciones'}</h2>
            <div className="rejilla mini">
              {enOutfits.map((o) => (
                <Link key={o.id} to={`/combinaciones/${o.id}`} className="tarjeta">
                  <Flatlay prendas={prendas.filter((p) => o.prenda_ids.includes(p.id))} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
