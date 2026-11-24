import { BUCKET, supabase } from './supabase'
import type { Categoria } from './categorias'
import { guardar, guardarFoto, leer, olvidarFoto } from './local'

export interface Prenda {
  id: string
  nombre: string | null
  categoria: Categoria
  color: string | null
  notas: string | null
  image_path: string
  created_at: string
  /** URL firmada temporal para mostrar la imagen. */
  url: string
}

export interface Outfit {
  id: string
  nombre: string | null
  created_at: string
  prenda_ids: string[]
}

export type DatosPrenda = Pick<Prenda, 'nombre' | 'categoria' | 'color' | 'notas'>

// ─── URLs firmadas (bucket privado) ─────────────────────────
const VIGENCIA = 60 * 60 * 6 // segundos
type Firmada = { url: string; caduca: number }
// Se conservan entre aperturas: con la misma URL la foto no se vuelve a pedir ni a decodificar
const cacheUrls = new Map<string, Firmada>(leer<[string, Firmada][]>('urls') ?? [])
const guardarUrls = () => guardar('urls', [...cacheUrls].filter(([, u]) => u.caduca > Date.now()))
export const olvidarUrls = () => cacheUrls.clear()

async function firmar(paths: string[]): Promise<Map<string, string>> {
  const ahora = Date.now()
  const faltan = paths.filter((p) => (cacheUrls.get(p)?.caduca ?? 0) < ahora)
  if (faltan.length) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(faltan, VIGENCIA)
    if (error) throw error
    for (const d of data) {
      if (d.path && d.signedUrl) cacheUrls.set(d.path, { url: d.signedUrl, caduca: ahora + (VIGENCIA - 300) * 1000 })
    }
    guardarUrls()
  }
  return new Map(paths.map((p) => [p, cacheUrls.get(p)?.url ?? '']))
}

// ─── Prendas ────────────────────────────────────────────────
export async function listarPrendas(): Promise<Prenda[]> {
  const { data, error } = await supabase.from('prendas').select('*').order('created_at', { ascending: false })
  if (error) throw error
  const urls = await firmar(data.map((p) => p.image_path))
  return data.map((p) => ({ ...p, url: urls.get(p.image_path) ?? '' }))
}

async function subirFoto(imagen: Blob): Promise<string> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sesión caducada')
  const ext = imagen.type === 'image/webp' ? 'webp' : imagen.type === 'image/png' ? 'png' : 'jpg'
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, imagen, { contentType: imagen.type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return path
}

export async function crearPrenda(imagen: Blob, datos: DatosPrenda): Promise<Prenda> {
  const path = await subirFoto(imagen)
  const { data, error } = await supabase
    .from('prendas')
    .insert({ ...datos, image_path: path })
    .select()
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  await guardarFoto(path, imagen)
  const urls = await firmar([path])
  return { ...data, url: urls.get(path) ?? '' }
}

export async function actualizarPrenda(id: string, datos: Partial<DatosPrenda>) {
  const { error } = await supabase.from('prendas').update(datos).eq('id', id)
  if (error) throw error
}

/** Sustituye la foto. La anterior solo se borra cuando la nueva ya está en uso. */
export async function cambiarFoto(prenda: Prenda, imagen: Blob): Promise<Pick<Prenda, 'image_path' | 'url'>> {
  const path = await subirFoto(imagen)
  const { error } = await supabase.from('prendas').update({ image_path: path }).eq('id', prenda.id)
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  await guardarFoto(path, imagen)
  const url = (await firmar([path])).get(path) ?? ''
  await supabase.storage.from(BUCKET).remove([prenda.image_path])
  cacheUrls.delete(prenda.image_path)
  guardarUrls()
  await olvidarFoto(prenda.image_path)
  return { image_path: path, url }
}

export async function borrarPrenda(prenda: Prenda) {
  const { error } = await supabase.from('prendas').delete().eq('id', prenda.id)
  if (error) throw error
  await supabase.storage.from(BUCKET).remove([prenda.image_path])
  cacheUrls.delete(prenda.image_path)
  guardarUrls()
  await olvidarFoto(prenda.image_path)
}

// ─── Combinaciones ──────────────────────────────────────────
export async function listarOutfits(): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from('outfits')
    .select('id, nombre, created_at, outfit_prendas(prenda_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(({ outfit_prendas, ...o }) => ({
    ...o,
    prenda_ids: (outfit_prendas as { prenda_id: string }[]).map((x) => x.prenda_id),
  }))
}

export async function guardarOutfit(o: { id?: string; nombre: string | null; prenda_ids: string[] }): Promise<Outfit> {
  let fila: { id: string; nombre: string | null; created_at: string }
  if (o.id) {
    const { data, error } = await supabase.from('outfits').update({ nombre: o.nombre }).eq('id', o.id).select().single()
    if (error) throw error
    fila = data
    const del = await supabase.from('outfit_prendas').delete().eq('outfit_id', o.id)
    if (del.error) throw del.error
  } else {
    const { data, error } = await supabase.from('outfits').insert({ nombre: o.nombre }).select().single()
    if (error) throw error
    fila = data
  }
  if (o.prenda_ids.length) {
    const { error } = await supabase
      .from('outfit_prendas')
      .insert(o.prenda_ids.map((prenda_id) => ({ outfit_id: fila.id, prenda_id })))
    if (error) throw error
  }
  return { ...fila, prenda_ids: o.prenda_ids }
}

export async function borrarOutfit(id: string) {
  const { error } = await supabase.from('outfits').delete().eq('id', id)
  if (error) throw error
}
