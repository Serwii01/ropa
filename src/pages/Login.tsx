import { useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** Traduce los fallos de acceso más comunes; el resto se muestra tal cual. */
function textoError(error: AuthError): string {
  if (error.name === 'AuthRetryableFetchError')
    return 'No se puede conectar con el servidor. Revisa tu conexión o si el proyecto de Supabase está pausado.'
  if (error.code === 'invalid_credentials') return 'Email o contraseña incorrectos.'
  if (error.code === 'email_not_confirmed') return 'Confirma tu cuenta desde el correo que te enviamos.'
  if (error.code === 'signup_disabled') return 'El registro está cerrado.'
  return error.message
}

export function Login() {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setMensaje(null)
    const { data, error } =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setEnviando(false)
    if (error) setMensaje(textoError(error))
    else if (modo === 'registro' && !data.session) setMensaje('Revisa tu correo para confirmar la cuenta.')
  }

  return (
    <div className="login">
      <div className="login-caja">
        <h1 className="marca grande">ropa</h1>
        <p className="sutil">Tu armario, en el bolsillo.</p>
        <form onSubmit={enviar} className="form">
          <label>
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mensaje && <p className="aviso">{mensaje}</p>}
          <button className="btn primario" disabled={enviando}>
            {enviando && <span className="girando" />}
            {enviando ? (modo === 'entrar' ? 'Entrando…' : 'Creando…') : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
        <button className="enlace" onClick={() => setModo(modo === 'entrar' ? 'registro' : 'entrar')}>
          {modo === 'entrar' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  )
}
