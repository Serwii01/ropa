# ropa

Inventario personal de armario como PWA instalable: fotografías prendas, se les quita el fondo y se comprimen en el propio móvil, se etiquetan por tipo y se crean combinaciones (outfits). Uso personal.

## Stack
- Vite + React + TypeScript, `vite-plugin-pwa`.
- Supabase: Auth, Postgres (tablas `prendas`, `outfits`, `outfit_prendas` con RLS) y Storage (bucket privado `prendas`). Esquema en `supabase/schema.sql`.
- Imagen 100 % en el navegador: `@imgly/background-removal` (ONNX/WASM, ~40 MB la primera vez) → recorte al contorno → WebP 900 px calidad 0.8 (PNG en Safari).
- Despliegue en Vercel (`vercel.json` con rewrite SPA y cabeceras del service worker).

## Estructura
- `src/lib/` — `supabase.ts` (cliente), `api.ts` (CRUD + URLs firmadas), `image.ts` (procesado), `categorias.ts` (tipos de prenda y su capa), `store.tsx` (contexto del armario).
- `src/pages/` — Login, Armario, NuevaPrenda, DetallePrenda, Combinaciones, Combinar.
- `src/components/` — Layout, Flatlay (composición), FormPrenda, Icons.
- `scripts/generate-icons.mjs` — iconos de la PWA.

## Comandos
```bash
npm run dev       # desarrollo (necesita .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
npm run build     # tsc --noEmit + vite build
npm run icons     # regenerar iconos PWA
```

## Convenciones
- Nombres de dominio y UI en español (prendas, combinaciones, categorías).
- Cada categoría pertenece a una capa (arriba, encima, abajo, calzado, accesorio) que decide su hueco en el flatlay.
- `.env` no se sube; usar `.env.example` como referencia.

## Notas
- Supabase gratis pausa el proyecto tras 7 días sin actividad.
- `@imgly/background-removal` es AGPL-3.0: revisar si algún día se publica como producto.

> El estado del trabajo (qué se hizo, qué falta) está en `STATUS.md`.
