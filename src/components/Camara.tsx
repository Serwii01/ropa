import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Categoria } from '../lib/categorias'
import { arribaDelMovil, type Vec } from '../lib/retoque'
import { plantillaDe } from '../lib/plantillas'

export const hayCamara = () => Boolean(navigator.mediaDevices?.getUserMedia)

/** En iPhone el sensor de inclinación pide permiso, y solo dentro de un toque. */
export function pedirNivel() {
  const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  D?.requestPermission?.().catch(() => {})
}

interface Props {
  categoria: Categoria | null
  /** `arriba`: hacia dónde quedaba arriba respecto al móvil, si hay sensor. */
  onFoto: (foto: File, arriba: Vec | null) => void
  onCerrar: () => void
  /** Abrir la cámara del sistema en su lugar. */
  onSistema: () => void
}

export function Camara({ categoria, onFoto, onCerrar, onSistema }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [lista, setLista] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const plantilla = plantillaDe(categoria)
  const { grados: inclinacion, arriba } = useInclinacion()

  useEffect(() => {
    let cancelado = false
    let flujo: MediaStream | undefined
    const parar = () => flujo?.getTracks().forEach((t) => t.stop())
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } } })
      .then(async (f) => {
        flujo = f
        if (cancelado) return parar()
        f.getVideoTracks()[0].onended = () => setError('La cámara se ha detenido.')
        const v = video.current!
        v.srcObject = f
        await v.play()
      })
      .catch((e: Error) => {
        if (cancelado) return
        setError(
          e.name === 'NotAllowedError'
            ? 'Sin permiso para usar la cámara aquí.'
            : 'No se puede abrir la cámara aquí.',
        )
      })
    return () => {
      cancelado = true
      parar()
    }
  }, [])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [onCerrar])

  function disparar() {
    const v = video.current!
    // Con la pantalla girada los ejes del sensor no son los de la imagen
    const tomada = (screen.orientation?.angle ?? 0) === 0 ? arriba.current : null
    // Solo lo que se ve en el visor 3:4 (object-fit: cover)
    const w = Math.min(v.videoWidth, v.videoHeight * 0.75)
    const h = w / 0.75
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w)
    canvas.height = Math.round(h)
    canvas
      .getContext('2d')!
      .drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (b) => (b ? onFoto(new File([b], 'foto.jpg', { type: 'image/jpeg' }), tomada) : setError('No se pudo hacer la foto.')),
      'image/jpeg',
      0.94,
    )
  }

  const recto = inclinacion != null && inclinacion <= 5

  return createPortal(
    <div className="camara" role="dialog" aria-modal="true" aria-label="Cámara">
      <div className="camara-visor">
        <video ref={video} playsInline muted onPlaying={() => setLista(true)} />
        {!error && (
          <svg className={`camara-guia ${recto ? 'recta' : ''}`} viewBox="0 0 75 100" aria-hidden="true">
            {plantilla && (
              <>
                <line x1="0" x2="75" y1={plantilla.linea} y2={plantilla.linea} />
                <line x1="37.5" x2="37.5" y1="0" y2="100" />
                <path d={plantilla.trazo} />
              </>
            )}
          </svg>
        )}
        {error ? (
          <div className="camara-error">
            <p>{error}</p>
            <button className="btn" onClick={onSistema}>Usar la cámara del móvil</button>
          </div>
        ) : (
          inclinacion != null && (
            <span className={`camara-nivel ${recto ? 'recta' : ''}`}>
              {recto ? 'Recto' : `Inclinado ${Math.round(inclinacion)}°`}
            </span>
          )
        )}
      </div>
      <p className="camara-ayuda">{plantilla?.ayuda ?? 'Prenda extendida y centrada'}</p>
      <div className="camara-mandos">
        <button onClick={onCerrar}>Cancelar</button>
        <button className="disparador" aria-label="Hacer foto" disabled={!lista || Boolean(error)} onClick={disparar} />
        <button onClick={onSistema}>Cámara móvil</button>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Grados que le faltan al móvil para estar paralelo a la prenda: tumbada (móvil horizontal) o
 * colgada (móvil vertical), lo que quede más cerca. null si no hay sensor.
 */
function useInclinacion() {
  const [grados, setGrados] = useState<number | null>(null)
  const arriba = useRef<Vec | null>(null)
  useEffect(() => {
    function medir(e: DeviceOrientationEvent) {
      if (e.beta == null || e.gamma == null) return
      // Componente de la gravedad perpendicular a la pantalla: 1 tumbado, 0 en vertical
      arriba.current = arribaDelMovil(e.beta, e.gamma)
      const tumbado = (Math.acos(Math.min(1, Math.abs(arriba.current[2]))) * 180) / Math.PI
      setGrados(Math.round(Math.min(tumbado, 90 - tumbado)))
    }
    addEventListener('deviceorientation', medir)
    return () => removeEventListener('deviceorientation', medir)
  }, [])
  return { grados, arriba }
}
