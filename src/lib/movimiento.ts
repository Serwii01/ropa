import { useLayoutEffect, useRef, type RefObject } from 'react'
import { flushSync } from 'react-dom'

export const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Aplica un cambio de estado con un fundido, si el navegador lo soporta. */
export function conTransicion(cambio: () => void) {
  if (!document.startViewTransition || document.hidden || movimientoReducido()) return cambio()
  document.documentElement.dataset.nav = 'lado'
  // Si otra transición la interrumpe, el cambio se aplica igual
  document.startViewTransition(() => flushSync(cambio)).ready.catch(() => {})
}

/**
 * Recoloca con suavidad los hijos de una rejilla (técnica FLIP). Cada hijo necesita `data-flip`.
 * Llama a la función devuelta justo antes del cambio de estado.
 */
export function useFlip(contenedor: RefObject<HTMLElement>, clave: unknown) {
  const antes = useRef<Map<string, DOMRect> | null>(null)

  const hijos = () => [...(contenedor.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])]

  useLayoutEffect(() => {
    const previas = antes.current
    antes.current = null
    if (!previas || movimientoReducido()) return
    const opciones = { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
    for (const el of hijos()) {
      const a = previas.get(el.dataset.flip!)
      const b = el.getBoundingClientRect()
      if (!a) {
        el.animate([{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }], opciones)
      } else if (a.left !== b.left || a.top !== b.top) {
        el.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], opciones)
      }
    }
  }, [clave])

  return () => {
    antes.current = new Map(hijos().map((el) => [el.dataset.flip!, el.getBoundingClientRect()]))
  }
}
