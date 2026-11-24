/** Lo que se guarda en el dispositivo para abrir rápido. Todo se borra al cerrar sesión. */
import { BUCKET, supabase } from './supabase'

const PREFIJO = 'ropa:'
/** Mismo nombre que en el service worker (vite.config.ts). */
const CACHE_FOTOS = 'fotos-prendas'

export function leer<T>(clave: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(PREFIJO + clave) ?? 'null') as T | null
  } catch {
    return null
  }
}

export function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor))
  } catch {
    // sin espacio o sin permiso: solo se pierde rapidez
  }
}

export async function olvidarTodo() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIJO)) localStorage.removeItem(k)
    await caches.delete(CACHE_FOTOS)
  } catch {
    // almacenamiento no disponible
  }
}

/** Clave de una foto en la caché: su URL firmada sin el token, igual que la calcula el service worker. */
const claveFoto = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl.replace('/object/public/', '/object/sign/')

/** Deja en caché una foto recién subida para no volver a descargarla. */
export async function guardarFoto(path: string, imagen: Blob) {
  try {
    const cache = await caches.open(CACHE_FOTOS)
    await cache.put(claveFoto(path), new Response(imagen, { headers: { 'Content-Type': imagen.type } }))
  } catch {
    // se descargará cuando haga falta
  }
}

export async function olvidarFoto(path: string) {
  try {
    await (await caches.open(CACHE_FOTOS)).delete(claveFoto(path))
  } catch {
    // caché no disponible
  }
}
