import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Barra } from '../components/Layout'
import { FormPrenda, borradorVacio, limpiar, type Borrador } from '../components/FormPrenda'
import { IconCamara, IconGaleria } from '../components/Icons'
import { crearPrenda } from '../lib/api'
import { comprimir, kb, quitarFondo } from '../lib/image'
import { useArmario } from '../lib/store'

type Fase = 'elegir' | 'procesando' | 'revisar'

export function NuevaPrenda() {
  const navigate = useNavigate()
  const { setPrendas } = useArmario()
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)

  const [fase, setFase] = useState<Fase>('elegir')
  const [conFondo, setConFondo] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [resultado, setResultado] = useState<Blob | null>(null)
  const [estado, setEstado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [borrador, setBorrador] = useState<Borrador>(borradorVacio)
  const [guardando, setGuardando] = useState(false)

  const urlFoto = useObjectUrl(foto)
  const urlResultado = useObjectUrl(resultado)

  async function procesar(archivo: File, mantenerFondo: boolean) {
    setFoto(archivo)
    setConFondo(mantenerFondo)
    setFase('procesando')
    setError(null)
    try {
      let imagen: Blob = archivo
      if (!mantenerFondo) {
        imagen = await quitarFondo(archivo, (f, x) => {
          if (f === 'modelo') setEstado(x != null && x < 1 ? `Preparando modelo · ${Math.round(x * 100)}%` : 'Preparando modelo…')
          else setEstado('Quitando fondo…')
        })
      }
      setEstado('Comprimiendo…')
      const final = await comprimir(imagen, mantenerFondo ? { max: 1100, recortar: false } : { max: 900, recortar: true })
      setResultado(final)
      setFase('revisar')
    } catch (e) {
      console.error(e)
      setError('No se pudo procesar la imagen. Prueba de nuevo o guárdala con fondo.')
      setFase('elegir')
    }
  }

  function elegido(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) procesar(f, conFondo)
  }

  async function guardar() {
    if (!resultado || !borrador.categoria) return
    setGuardando(true)
    try {
      const nueva = await crearPrenda(resultado, limpiar(borrador))
      setPrendas((ps) => [nueva, ...ps])
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setGuardando(false)
    }
  }

  return (
    <>
      <Barra titulo="Nueva prenda" />

      <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegido} />
      <input ref={galeria} type="file" accept="image/*" hidden onChange={elegido} />

      {fase === 'elegir' && (
        <div className="pila">
          <div className="origenes">
            <button className="origen" onClick={() => camara.current?.click()}>
              <IconCamara width={28} height={28} />
              <span>Hacer foto</span>
            </button>
            <button className="origen" onClick={() => galeria.current?.click()}>
              <IconGaleria width={28} height={28} />
              <span>Galería</span>
            </button>
          </div>
          <label className="interruptor">
            <input type="checkbox" checked={!conFondo} onChange={(e) => setConFondo(!e.target.checked)} />
            <span className="pista" />
            <span>
              Quitar fondo
              <small className="sutil">Se hace en tu móvil. La primera vez descarga el modelo (~40 MB).</small>
            </span>
          </label>
          <p className="sutil consejo">Consejo: prenda extendida sobre una superficie lisa y con buena luz.</p>
          {error && <p className="aviso">{error}</p>}
        </div>
      )}

      {fase === 'procesando' && (
        <div className="pila">
          <div className="vista-previa procesando">
            {urlFoto && <img src={urlFoto} alt="" />}
            <div className="barrido" />
          </div>
          <p className="estado">{estado}</p>
        </div>
      )}

      {fase === 'revisar' && resultado && (
        <div className="pila">
          <div className="vista-previa">
            {urlResultado && <img src={urlResultado} alt="Prenda procesada" />}
            <span className="peso">{kb(resultado)}</span>
          </div>
          <div className="fila-botones">
            <button className="btn" onClick={() => { setResultado(null); setFase('elegir') }}>Otra foto</button>
            {foto && (
              <button className="btn" onClick={() => procesar(foto, !conFondo)}>
                {conFondo ? 'Quitar fondo' : 'Mantener fondo'}
              </button>
            )}
          </div>
          <FormPrenda valor={borrador} onChange={setBorrador} />
          {error && <p className="aviso">{error}</p>}
          <button className="btn primario ancho" disabled={!borrador.categoria || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : borrador.categoria ? 'Guardar en el armario' : 'Elige un tipo'}
          </button>
        </div>
      )}
    </>
  )
}

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return setUrl(null)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
