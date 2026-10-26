import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconArmario, IconAtras, IconCombinar, IconSalir } from './Icons'

export function Layout() {
  return (
    <div className="app">
      <header className="cabecera">
        <span className="marca">ropa</span>
        <button
          className="icono-btn"
          aria-label="Cerrar sesión"
          onClick={() => confirm('¿Cerrar sesión?') && supabase.auth.signOut()}
        >
          <IconSalir />
        </button>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>
          <IconArmario />
          <span>Armario</span>
        </NavLink>
        <NavLink to="/combinaciones">
          <IconCombinar />
          <span>Combinar</span>
        </NavLink>
      </nav>
    </div>
  )
}

/** Cabecera de pantallas secundarias, con botón de volver. */
export function Barra({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="barra">
      <button
        className="icono-btn"
        aria-label="Volver"
        onClick={() => (history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      >
        <IconAtras />
      </button>
      <h1>{titulo}</h1>
      <div className="barra-acciones">{children}</div>
    </div>
  )
}
