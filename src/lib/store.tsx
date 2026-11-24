import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from 'react'
import { listarOutfits, listarPrendas, type Outfit, type Prenda } from './api'
import { guardar, leer } from './local'
import { supabase } from './supabase'

interface Armario {
  prendas: Prenda[]
  outfits: Outfit[]
  /** Aún no hay nada que mostrar. */
  cargando: boolean
  /** Se está pidiendo lo último al servidor, aunque ya se muestre lo guardado. */
  actualizando: boolean
  error: string | null
  recargar: () => Promise<void>
  setPrendas: React.Dispatch<SetStateAction<Prenda[]>>
  setOutfits: React.Dispatch<SetStateAction<Outfit[]>>
}

interface Guardado {
  usuario: string
  prendas: Prenda[]
  outfits: Outfit[]
}

const Ctx = createContext<Armario | null>(null)

export function ArmarioProvider({ usuario, children }: { usuario: string; children: ReactNode }) {
  const [inicial] = useState(() => {
    const g = leer<Guardado>('armario')
    return g?.usuario === usuario && g.prendas.length ? g : null
  })
  const [prendas, ponerPrendas] = useState<Prenda[]>(inicial?.prendas ?? [])
  const [outfits, ponerOutfits] = useState<Outfit[]>(inicial?.outfits ?? [])
  const [cargado, setCargado] = useState(false) // ya ha respondido el servidor
  const [cargando, setCargando] = useState(!inicial)
  const [actualizando, setActualizando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cuenta los cambios hechos aquí, para no pisarlos con una respuesta pedida antes
  const cambios = useRef(0)
  const setPrendas = useCallback((a: SetStateAction<Prenda[]>) => {
    cambios.current++
    ponerPrendas(a)
  }, [])
  const setOutfits = useCallback((a: SetStateAction<Outfit[]>) => {
    cambios.current++
    ponerOutfits(a)
  }, [])

  const recargar = useCallback(async () => {
    setError(null)
    setActualizando(true)
    try {
      for (;;) {
        // Sin sesión, las consultas irían como anónimo y devolverían un armario vacío
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (data.session?.user.id !== usuario) throw new Error('Sesión caducada')
        const antes = cambios.current
        const [p, o] = await Promise.all([listarPrendas(), listarOutfits()])
        if (antes !== cambios.current) continue
        ponerPrendas(p)
        ponerOutfits(o)
        setCargado(true)
        break
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [usuario])

  useEffect(() => {
    recargar()
  }, [recargar])

  useEffect(() => {
    // Antes de la primera respuesta, `prendas` puede estar vacío sin que el armario lo esté
    if (cargado || inicial) guardar('armario', { usuario, prendas, outfits } satisfies Guardado)
  }, [cargado, inicial, usuario, prendas, outfits])

  return (
    <Ctx.Provider value={{ prendas, outfits, cargando, actualizando, error, recargar, setPrendas, setOutfits }}>
      {children}
    </Ctx.Provider>
  )
}

export function useArmario() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useArmario fuera de ArmarioProvider')
  return ctx
}
