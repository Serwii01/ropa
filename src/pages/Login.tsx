import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

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
    if (error) setMensaje(error.message)
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
            {enviando ? '…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
        <button className="enlace" onClick={() => setModo(modo === 'entrar' ? 'registro' : 'entrar')}>
          {modo === 'entrar' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  )
}
