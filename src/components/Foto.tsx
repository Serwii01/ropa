import { useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

const vistas = new Set<string>()

/** Imagen que aparece con un fundido la primera vez que se carga. */
export function Foto({ src, className = '', ...resto }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [lista, setLista] = useState(() => vistas.has(src))

  function mostrar() {
    vistas.add(src)
    setLista(true)
  }

  useLayoutEffect(() => {
    if (ref.current?.complete) mostrar()
  }, [src])

  // crossOrigin: sin CORS la respuesta es opaca y en la caché infla la cuota
  return (
    <img
      {...resto}
      crossOrigin="anonymous"
      ref={ref}
      src={src}
      className={`foto ${lista ? 'lista' : ''} ${className}`}
      decoding={vistas.has(src) ? 'sync' : 'async'}
      onLoad={mostrar}
      onError={() => setLista(true)}
    />
  )
}
