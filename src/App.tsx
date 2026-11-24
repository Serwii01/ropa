import { useEffect, useState } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configurado, supabase } from './lib/supabase'
import { conTransicion } from './lib/movimiento'
import { ArmarioProvider } from './lib/store'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Armario } from './pages/Armario'
import { NuevaPrenda } from './pages/NuevaPrenda'
import { DetallePrenda } from './pages/DetallePrenda'
import { Combinaciones } from './pages/Combinaciones'
import { Combinar } from './pages/Combinar'

// Si el sistema ya anima el gesto de volver, no animamos encima
let animaElSistema = false
window.addEventListener('popstate', (e) => {
  animaElSistema = (e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition ?? false
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Armario /> },
      { path: 'nueva', element: <NuevaPrenda /> },
      { path: 'prenda/:id', element: <DetallePrenda /> },
      { path: 'combinaciones', element: <Combinaciones /> },
      { path: 'combinaciones/nueva', element: <Combinar /> },
      { path: 'combinaciones/:id', element: <Combinar /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

// El sentido de la transición (styles.css) depende de si se entra o se sale de una pantalla
const esSecundaria = (ruta: string) => ruta !== '/' && ruta !== '/combinaciones'
let anterior = router.state.location
router.subscribe(({ location, historyAction }) => {
  if (location === anterior) return
  const de = esSecundaria(anterior.pathname)
  const a = esSecundaria(location.pathname)
  anterior = location
  let sentido = 'lado'
  if (animaElSistema) sentido = 'sistema'
  else if (de && a) sentido = historyAction === 'POP' ? 'atras' : 'adelante'
  else if (a) sentido = 'adelante'
  else if (de) sentido = 'atras'
  animaElSistema = false
  document.documentElement.dataset.nav = sentido
})

export default function App() {
  if (!configurado) return <SinConfigurar />
  return <ConSesion />
}

function ConSesion() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let ultimo: string | null | undefined
    function aplicar(s: Session | null) {
      const usuario = s?.user.id ?? null
      if (usuario === ultimo) return setSesion(s)
      ultimo = usuario
      conTransicion(() => setSesion(s))
    }
    supabase.auth.getSession().then(({ data }) => aplicar(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => aplicar(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sesion === undefined) return <div className="splash"><span className="marca grande">ropa</span></div>
  if (!sesion) return <Login />

  return (
    <ArmarioProvider key={sesion.user.id}>
      <RouterProvider router={router} />
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
