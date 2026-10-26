import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configurado, supabase } from './lib/supabase'
import { ArmarioProvider } from './lib/store'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Armario } from './pages/Armario'
import { NuevaPrenda } from './pages/NuevaPrenda'
import { DetallePrenda } from './pages/DetallePrenda'
import { Combinaciones } from './pages/Combinaciones'
import { Combinar } from './pages/Combinar'

export default function App() {
  if (!configurado) return <SinConfigurar />
  return <ConSesion />
}

function ConSesion() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sesion === undefined) return <div className="splash marca grande">ropa</div>
  if (!sesion) return <Login />

  return (
    <ArmarioProvider key={sesion.user.id}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Armario />} />
            <Route path="nueva" element={<NuevaPrenda />} />
            <Route path="prenda/:id" element={<DetallePrenda />} />
            <Route path="combinaciones" element={<Combinaciones />} />
            <Route path="combinaciones/nueva" element={<Combinar />} />
            <Route path="combinaciones/:id" element={<Combinar />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ArmarioProvider>
  )
}

function SinConfigurar() {
  return (
    <div className="login">
      <div className="login-caja">
        <h1 className="marca grande">ropa</h1>
        <p className="sutil">
          Falta configurar Supabase. Copia <code>.env.example</code> a <code>.env</code> y rellena{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    </div>
  )
}
