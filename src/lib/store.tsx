import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { listarOutfits, listarPrendas, type Outfit, type Prenda } from './api'

interface Armario {
  prendas: Prenda[]
  outfits: Outfit[]
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  setPrendas: React.Dispatch<React.SetStateAction<Prenda[]>>
  setOutfits: React.Dispatch<React.SetStateAction<Outfit[]>>
}

const Ctx = createContext<Armario | null>(null)

export function ArmarioProvider({ children }: { children: ReactNode }) {
  const [prendas, setPrendas] = useState<Prenda[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setError(null)
    try {
      const [p, o] = await Promise.all([listarPrendas(), listarOutfits()])
      setPrendas(p)
      setOutfits(o)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  return (
    <Ctx.Provider value={{ prendas, outfits, cargando, error, recargar, setPrendas, setOutfits }}>
      {children}
    </Ctx.Provider>
  )
}

export function useArmario() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useArmario fuera de ArmarioProvider')
  return ctx
}
