import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Barra } from '../components/Layout'
import { FormPrenda, limpiar, type Borrador } from '../components/FormPrenda'
import { Foto } from '../components/Foto'
import { Flatlay } from '../components/Flatlay'
import { IconPapelera } from '../components/Icons'
import { actualizarPrenda, borrarPrenda, cambiarFoto } from '../lib/api'
import { etiqueta } from '../lib/categorias'
import { igualar, reencuadrar, SinPrenda } from '../lib/image'
import { useArmario } from '../lib/store'

export function DetallePrenda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { prendas, outfits, setPrendas, setOutfits, actualizando } = useArmario()
  const prenda = prendas.find((p) => p.id === id)

  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [igualando, setIgualando] = useState(false)
  const [igualada, setIgualada] = useState(false)
  const [propuesta, setPropuesta] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => () => {
    if (propuesta) URL.revokeObjectURL(propuesta.url)
  }, [propuesta])

  if (!prenda) {
    return (
      <>
        <Barra titulo="" />
        <p className="sutil centrado">{actualizando ? 'Cargando…' : 'Esta prenda ya no existe.'}</p>
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
      setIgualada(false)
      await actualizarPrenda(prenda!.id, datos)
      setPrendas((ps) => ps.map((p) => (p.id === prenda!.id ? { ...p, ...datos } : p)))
      setBorrador(null)
      if (datos.categoria !== prenda!.categoria) {
        const foto = await reencuadrar(await descargar(), prenda!.categoria, datos.categoria)
        if (foto) await poner(foto)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  async function descargar() {
    const r = await fetch(prenda!.url)
    if (!r.ok) throw new Error('No se pudo descargar la foto.')
    return r.blob()
  }

  async function poner(foto: Blob) {
    const nueva = await cambiarFoto(prenda!, foto)
    setPrendas((ps) => ps.map((p) => (p.id === prenda!.id ? { ...p, ...nueva } : p)))
  }

  async function proponer() {
    setIgualando(true)
    setError(null)
    try {
      const blob = await igualar(await descargar(), prenda!.categoria)
      setIgualada(!blob)
      if (blob) setPropuesta({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setError(e instanceof SinPrenda ? 'No se distingue la prenda en la foto.' : e instanceof Error ? e.message : String(e))
    } finally {
      setIgualando(false)
    }
  }

  async function aceptar() {
    if (!propuesta) return
    setIgualando(true)
    setError(null)
    try {
      await poner(propuesta.blob)
      setPropuesta(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIgualando(false)
    }
  }

  async function borrar() {
    if (!confirm('¿Eliminar esta prenda? También se quitará de tus combinaciones.')) return
    setOcupado(true)
    try {
      await borrarPrenda(prenda!)
      setPrendas((ps) => ps.filter((p) => p.id !== prenda!.id))
      setOutfits((os) => os.map((o) => ({ ...o, prenda_ids: o.prenda_ids.filter((x) => x !== prenda!.id) })))
      navigate('/', { replace: true, viewTransition: true })
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
        <div className="vista-previa" style={{ viewTransitionName: 'foto-prenda' }}>
          <Foto src={propuesta?.url ?? prenda.url} alt={prenda.nombre ?? ''} />
        </div>
        {propuesta ? (
          <div className="fila-botones">
            <button className="btn" onClick={() => setPropuesta(null)} disabled={igualando}>Dejar como estaba</button>
            <button className="btn primario" onClick={aceptar} disabled={igualando}>
              {igualando && <span className="girando" />}
              Usar esta
            </button>
          </div>
        ) : (
          <button className="btn" onClick={proponer} disabled={igualando || ocupado || igualada || Boolean(borrador)}>
            {igualando && <span className="girando" />}
            {igualando ? 'Igualando…' : igualada ? 'Ya está igualada' : 'Igualar foto con las demás'}
          </button>
        )}

        <FormPrenda valor={valor} onChange={setBorrador} />
        {error && <p className="aviso">{error}</p>}
        {borrador && (
          <button className="btn primario ancho" onClick={guardar} disabled={ocupado || igualando || Boolean(propuesta)}>
            {ocupado && <span className="girando" />}
            {ocupado ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}

        {enOutfits.length > 0 && (
          <section>
            <h2 className="subtitulo">En {enOutfits.length} {enOutfits.length === 1 ? 'combinación' : 'combinaciones'}</h2>
            <div className="rejilla mini">
              {enOutfits.map((o) => (
                <Link key={o.id} to={`/combinaciones/${o.id}`} viewTransition className="tarjeta">
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
