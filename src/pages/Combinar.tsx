import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Barra } from '../components/Layout'
import { Foto } from '../components/Foto'
import { Flatlay } from '../components/Flatlay'
import { IconDado, IconPapelera } from '../components/Icons'
import { borrarOutfit, guardarOutfit, type Outfit, type Prenda } from '../lib/api'
import { CAPAS, cajaEnTarjeta, capaDe, etiqueta, type Capa } from '../lib/categorias'
import { movimientoReducido } from '../lib/movimiento'
import { useArmario } from '../lib/store'

type Seleccion = Partial<Record<Capa, string>>

function seleccionDe(outfit: Outfit | undefined, prendas: Prenda[]): Seleccion {
  const s: Seleccion = {}
  for (const pid of outfit?.prenda_ids ?? []) {
    const p = prendas.find((x) => x.id === pid)
    if (p) s[capaDe(p.categoria)] = p.id
  }
  return s
}

export function Combinar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { prendas, outfits, setOutfits } = useArmario()
  const existente = id ? outfits.find((o) => o.id === id) : undefined

  const [sel, setSel] = useState<Seleccion>(() => seleccionDe(existente, prendas))
  const [nombre, setNombre] = useState(existente?.nombre ?? '')
  // Las prendas caen en su sitio solo tras el primer toque, no al abrir
  const [animar, setAnimar] = useState(false)
  const [tirada, setTirada] = useState(0)
  const barajando = useRef<number>()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar la combinación al editar, y refrescarla si llega algo más nuevo sin haberla tocado aún
  const tocada = useRef(false)
  useEffect(() => {
    if (!existente || tocada.current) return
    setSel(seleccionDe(existente, prendas))
    setNombre(existente.nombre ?? '')
  }, [existente, prendas])

  useEffect(() => () => clearTimeout(barajando.current), [])

  const porCapa = useMemo(() => {
    const m = new Map<Capa, Prenda[]>()
    for (const p of prendas) {
      const c = capaDe(p.categoria)
      m.set(c, [...(m.get(c) ?? []), p])
    }
    return m
  }, [prendas])

  const elegidas = Object.values(sel).flatMap((pid) => prendas.find((p) => p.id === pid) ?? [])

  function alternar(capa: Capa, pid: string) {
    clearTimeout(barajando.current)
    tocada.current = true
    setAnimar(true)
    setSel((s) => ({ ...s, [capa]: s[capa] === pid ? undefined : pid }))
  }

  function aleatorio(): Seleccion {
    const azar = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
    const s: Seleccion = {}
    // Como base vale una camiseta o una camisa
    const bases = [...(porCapa.get('superior') ?? []), ...(porCapa.get('camisa') ?? [])]
    if (bases.length) {
      const base = azar(bases)
      s[capaDe(base.categoria)] = base.id
    }
    // Sin base, al menos una sudadera o un jersey
    const medias = porCapa.get('media')
    if (medias?.length && (!bases.length || Math.random() < 0.4)) s.media = azar(medias).id
    // Chaqueta o abrigo, no los dos
    const fuera = [...(porCapa.get('exterior') ?? []), ...(porCapa.get('abrigo') ?? [])]
    if (fuera.length && Math.random() < 0.5) {
      const p = azar(fuera)
      s[capaDe(p.categoria)] = p.id
    }
    for (const capa of ['inferior', 'calzado'] as Capa[]) {
      const xs = porCapa.get(capa)
      if (xs?.length) s[capa] = azar(xs).id
    }
    const accesorios = porCapa.get('accesorio')
    if (accesorios?.length && Math.random() < 0.5) s.accesorio = azar(accesorios).id
    // Un vestido no necesita parte de abajo
    const sup = prendas.find((p) => p.id === s.superior)
    if (sup?.categoria === 'vestido') delete s.inferior
    return s
  }

  function tirarDado() {
    clearTimeout(barajando.current)
    tocada.current = true
    setAnimar(true)
    setTirada((t) => t + 1)
    let quedan = movimientoReducido() ? 0 : 3
    const paso = () => {
      setSel(aleatorio())
      if (quedan-- > 0) barajando.current = window.setTimeout(paso, 110)
    }
    paso()
  }

  async function guardar() {
    clearTimeout(barajando.current)
    setOcupado(true)
    setError(null)
    try {
      const o = await guardarOutfit({ id: existente?.id, nombre: nombre.trim() || null, prenda_ids: elegidas.map((p) => p.id) })
      setOutfits((os) => (existente ? os.map((x) => (x.id === o.id ? o : x)) : [o, ...os.filter((x) => x.id !== o.id)]))
      navigate('/combinaciones', { replace: true, viewTransition: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setOcupado(false)
    }
  }

  async function borrar() {
    if (!existente || !confirm('¿Eliminar esta combinación?')) return
    setOcupado(true)
    try {
      await borrarOutfit(existente.id)
      setOutfits((os) => os.filter((x) => x.id !== existente.id))
      navigate('/combinaciones', { replace: true, viewTransition: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setOcupado(false)
    }
  }

  return (
    <>
      <Barra titulo={existente ? 'Editar combinación' : 'Nueva combinación'}>
        <button className="icono-btn" aria-label="Combinación al azar" onClick={tirarDado}>
          <IconDado key={tirada} className={tirada ? 'rueda' : undefined} />
        </button>
        {existente && (
          <button className="icono-btn peligro" aria-label="Eliminar" onClick={borrar} disabled={ocupado}>
            <IconPapelera />
          </button>
        )}
      </Barra>

      <div className="combinar">
        <div className="combinar-lienzo">
          <Flatlay prendas={elegidas} className={`grande ${animar ? 'animado' : ''}`} style={existente && { viewTransitionName: 'foto-combinacion' }} />
        </div>

        {CAPAS.map(({ id: capa, label }) => {
          const xs = porCapa.get(capa)
          if (!xs?.length) return null
          return (
            <section key={capa} className="capa">
              <h2 className="subtitulo">{label}</h2>
              <div className="carrusel">
                {xs.map((p) => (
                  <button
                    key={p.id}
                    className={`miniatura ${sel[capa] === p.id ? 'activa' : ''}`}
                    onClick={() => alternar(capa, p.id)}
                    aria-pressed={sel[capa] === p.id}
                    title={p.nombre ?? etiqueta(p.categoria)}
                  >
                    <Foto style={cajaEnTarjeta(p.categoria)} src={p.url} alt={p.nombre ?? etiqueta(p.categoria)} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )
        })}

        <div className="pila">
          <label className="form">
            <span className="sutil">Nombre</span>
            <input value={nombre} onChange={(e) => { tocada.current = true; setNombre(e.target.value) }} placeholder="Opcional · p. ej. Domingo" />
          </label>
          {error && <p className="aviso">{error}</p>}
          <button className="btn primario ancho" disabled={elegidas.length === 0 || ocupado} onClick={guardar}>
            {ocupado && <span className="girando" />}
            {ocupado ? 'Guardando…' : 'Guardar combinación'}
          </button>
        </div>
      </div>
    </>
  )
}
