import { useEffect, useState } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { configurado, supabase } from './lib/supabase'
import { conTransicion } from './lib/movimiento'
import { olvidarUrls } from './lib/api'
import { guardar, leer, olvidarTodo } from './lib/local'
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
  // Con el último usuario recordado se abre sin esperar a que Supabase renueve la sesión
  const [inicial] = useState(() => leer<string>('usuario') ?? undefined)
  const [usuario, setUsuario] = useState<string | null | undefined>(inicial)

  useEffect(() => {
    let ultimo: string | null | undefined = inicial
    function aplicar(id: string | null) {
      if (id) guardar('usuario', id)
      if (id === ultimo) return
      ultimo = id
      conTransicion(() => setUsuario(id))
    }
    function olvidar() {
      olvidarUrls()
      olvidarTodo()
      aplicar(null)
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) aplicar(data.session.user.id)
      else if (!error) olvidar()
      // Sin red no se puede renovar la sesión, pero tampoco se ha cerrado
      else if (!ultimo) aplicar(null)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_OUT') olvidar()
      else if (s) aplicar(s.user.id)
    })
    return () => data.subscription.unsubscribe()
  }, [inicial])

  if (usuario === undefined) return <div className="splash"><span className="marca grande">ropa</span></div>
  if (!usuario) return <Login />

  return (
    <ArmarioProvider key={usuario} usuario={usuario}>
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
