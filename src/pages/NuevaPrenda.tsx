import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Barra } from '../components/Layout'
import { Camara, hayCamara, pedirNivel } from '../components/Camara'
import { FormPrenda, SelectorTipo, borradorVacio, limpiar, type Borrador } from '../components/FormPrenda'
import { IconCamara, IconGaleria } from '../components/Icons'
import { crearPrenda } from '../lib/api'
import { comprimir, kb, quitarFondo, SinPrenda } from '../lib/image'
import { guardar as guardarLocal, leer } from '../lib/local'
import { useArmario } from '../lib/store'

type Fase = 'elegir' | 'procesando' | 'revisar'

export function NuevaPrenda() {
  const navigate = useNavigate()
  const { setPrendas } = useArmario()
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)

  const [enCamara, setEnCamara] = useState(false)
  const [fase, setFase] = useState<Fase>('elegir')
  const [conFondo, setConFondo] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [resultado, setResultado] = useState<Blob | null>(null)
  const [estado, setEstado] = useState('')
  const [avance, setAvance] = useState<number | null>(null) // null: sin porcentaje conocido
  const [error, setError] = useState<string | null>(null)
  const [borrador, setBorrador] = useState<Borrador>(borradorVacio)
  const [guardando, setGuardando] = useState(false)

  const urlFoto = useObjectUrl(foto)
  const urlResultado = useObjectUrl(resultado)

  async function procesar(archivo: File, mantenerFondo: boolean) {
    setFoto(archivo)
    setConFondo(mantenerFondo)
    setEstado('')
    setAvance(null)
    setFase('procesando')
    setError(null)
    try {
      let imagen: Blob = archivo
      if (!mantenerFondo) {
        imagen = await quitarFondo(archivo, (f, x) => {
          setAvance(f === 'modelo' && x ? x : null)
          if (f === 'modelo') setEstado(x != null && x < 1 ? `Preparando modelo · ${Math.round(x * 100)}%` : 'Preparando modelo…')
          else setEstado('Quitando fondo…')
        })
      }
      setAvance(null)
      setEstado('Comprimiendo…')
      const final = await comprimir(imagen, mantenerFondo ? { max: 1100, recortar: false } : { max: 900, recortar: true })
      setResultado(final)
      setFase('revisar')
    } catch (e) {
      console.error(e)
      setError(
        e instanceof SinPrenda
          ? 'No se distingue la prenda. Prueba con más luz o sobre un fondo de otro color, o guárdala con fondo.'
          : 'No se pudo procesar la imagen. Prueba de nuevo o guárdala con fondo.',
      )
      setFase('elegir')
    }
  }

  function elegido(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) procesar(f, conFondo)
  }

  function hacerFoto() {
    if (!hayCamara()) return camara.current?.click()
    pedirNivel()
    setEnCamara(true)
  }

  async function guardar() {
    if (!resultado || !borrador.categoria) return
    setGuardando(true)
    try {
      const nueva = await crearPrenda(resultado, limpiar(borrador))
      setPrendas((ps) => [nueva, ...ps.filter((p) => p.id !== nueva.id)])
      // Que el filtro recordado no esconda la prenda recién añadida
      if (leer('filtro') !== nueva.categoria) guardarLocal('filtro', 'todas')
      navigate('/', { replace: true, viewTransition: true })
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

      {enCamara && (
        <Camara
          categoria={borrador.categoria}
          onCerrar={() => setEnCamara(false)}
          onSistema={() => {
            setEnCamara(false)
            camara.current?.click()
          }}
          onFoto={(f) => {
            setEnCamara(false)
            procesar(f, conFondo)
          }}
        />
      )}

      {fase === 'elegir' && (
        <div className="pila">
          <div className="form">
            <SelectorTipo valor={borrador.categoria} onChange={(categoria) => setBorrador((b) => ({ ...b, categoria }))} />
          </div>
          <div className="origenes">
            <button className="origen" onClick={hacerFoto}>
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
          <p className="sutil consejo">{borrador.categoria ? 'Verás una silueta para colocar la prenda. Mejor sobre una superficie lisa y con buena luz.' : 'Elige el tipo para ver una silueta al hacer la foto.'}</p>
          {error && <p className="aviso">{error}</p>}
        </div>
      )}

      {fase === 'procesando' && (
        <div className="pila">
          <div className="vista-previa procesando">
            {urlFoto && <img src={urlFoto} alt="" />}
            <div className="barrido" />
          </div>
          <div className={`progreso ${avance == null ? 'indefinido' : ''}`}>
            <span style={avance == null ? undefined : { transform: `scaleX(${avance})` }} />
          </div>
          <p className="estado" role="status">{estado}</p>
        </div>
      )}

      {fase === 'revisar' && resultado && (
        <div className="pila">
          <div className="vista-previa">
            {!conFondo && urlFoto && <img className="antes" src={urlFoto} alt="" />}
            {urlResultado && <img className="recorte" src={urlResultado} alt="Prenda procesada" />}
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
            {guardando && <span className="girando" />}
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
