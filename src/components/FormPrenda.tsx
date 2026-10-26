import type { DatosPrenda } from '../lib/api'
import { CATEGORIAS, type Categoria } from '../lib/categorias'

export type Borrador = Omit<DatosPrenda, 'categoria'> & { categoria: Categoria | null }

export const borradorVacio: Borrador = { nombre: '', categoria: null, color: '', notas: '' }

/** Normaliza: cadenas vacías → null. */
export function limpiar(b: Borrador): DatosPrenda {
  const t = (s: string | null) => (s?.trim() ? s.trim() : null)
  return { nombre: t(b.nombre), categoria: b.categoria!, color: t(b.color), notas: t(b.notas) }
}

export function FormPrenda({ valor, onChange }: { valor: Borrador; onChange: (b: Borrador) => void }) {
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => onChange({ ...valor, [k]: v })

  return (
    <div className="form">
      <fieldset>
        <legend>Tipo</legend>
        <div className="chips envolver">
          {CATEGORIAS.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`chip ${valor.categoria === c.id ? 'activo' : ''}`}
              onClick={() => set('categoria', c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <span>Nombre</span>
        <input value={valor.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} placeholder="Opcional · p. ej. Camiseta blanca básica" />
      </label>
      <label>
        <span>Color</span>
        <input value={valor.color ?? ''} onChange={(e) => set('color', e.target.value)} placeholder="Opcional" />
      </label>
      <label>
        <span>Notas</span>
        <textarea rows={2} value={valor.notas ?? ''} onChange={(e) => set('notas', e.target.value)} placeholder="Talla, marca, dónde la compraste…" />
      </label>
    </div>
  )
}
