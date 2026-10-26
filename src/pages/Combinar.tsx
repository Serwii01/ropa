import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Barra } from '../components/Layout'
import { Flatlay } from '../components/Flatlay'
import { IconDado, IconPapelera } from '../components/Icons'
import { borrarOutfit, guardarOutfit, type Prenda } from '../lib/api'
import { CAPAS, capaDe, etiqueta, type Capa } from '../lib/categorias'
import { useArmario } from '../lib/store'

type Seleccion = Partial<Record<Capa, string>>

export function Combinar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { prendas, outfits, setOutfits } = useArmario()
  const existente = id ? outfits.find((o) => o.id === id) : undefined

  const [sel, setSel] = useState<Seleccion>({})
  const [nombre, setNombre] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar la combinación al editar (cuando el armario termina de cargar)
  useEffect(() => {
    if (!existente) return
    const s: Seleccion = {}
    for (const pid of existente.prenda_ids) {
      const p = prendas.find((x) => x.id === pid)
      if (p) s[capaDe(p.categoria)] = p.id
    }
    setSel(s)
    setNombre(existente.nombre ?? '')
  }, [existente, prendas])

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
    setSel((s) => ({ ...s, [capa]: s[capa] === pid ? undefined : pid }))
  }

  function aleatorio() {
    const azar = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
    const s: Seleccion = {}
    for (const capa of ['superior', 'inferior', 'calzado'] as Capa[]) {
      const xs = porCapa.get(capa)
      if (xs?.length) s[capa] = azar(xs).id
    }
    // Las capas opcionales solo a veces
    for (const capa of ['exterior', 'accesorio'] as Capa[]) {
      const xs = porCapa.get(capa)
      if (xs?.length && Math.random() < 0.5) s[capa] = azar(xs).id
    }
    // Un vestido no necesita parte de abajo
    const sup = prendas.find((p) => p.id === s.superior)
    if (sup?.categoria === 'vestido') delete s.inferior
    setSel(s)
  }

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      const o = await guardarOutfit({ id: existente?.id, nombre: nombre.trim() || null, prenda_ids: elegidas.map((p) => p.id) })
      setOutfits((os) => (existente ? os.map((x) => (x.id === o.id ? o : x)) : [o, ...os]))
      navigate('/combinaciones', { replace: true })
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
      navigate('/combinaciones', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setOcupado(false)
    }
  }

  return (
    <>
      <Barra titulo={existente ? 'Editar combinación' : 'Nueva combinación'}>
        <button className="icono-btn" aria-label="Combinación al azar" onClick={aleatorio}>
          <IconDado />
        </button>
        {existente && (
          <button className="icono-btn peligro" aria-label="Eliminar" onClick={borrar} disabled={ocupado}>
            <IconPapelera />
          </button>
        )}
      </Barra>

      <div className="combinar">
        <div className="combinar-lienzo">
          <Flatlay prendas={elegidas} className="grande" />
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
                    <img src={p.url} alt={p.nombre ?? etiqueta(p.categoria)} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )
        })}

        <div className="pila">
          <label className="form">
            <span className="sutil">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Opcional · p. ej. Domingo" />
          </label>
          {error && <p className="aviso">{error}</p>}
          <button className="btn primario ancho" disabled={elegidas.length === 0 || ocupado} onClick={guardar}>
            {ocupado ? 'Guardando…' : 'Guardar combinación'}
          </button>
        </div>
      </div>
    </>
  )
}
