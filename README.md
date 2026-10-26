# ropa

Inventario personal de armario. PWA instalable: fotografías tus prendas, se les quita el fondo y se comprimen en el propio móvil, las etiquetas por tipo y creas combinaciones.

**Stack:** Vite + React + TypeScript · Supabase (Auth, Postgres, Storage) · Vercel · `vite-plugin-pwa`

## Cómo funciona la imagen

Todo ocurre en el navegador, sin servidor ni APIs de pago:

1. **Quitar fondo:** [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) ejecuta un modelo de segmentación (ONNX/WASM). La primera vez descarga ~40 MB desde su CDN; el service worker lo guarda en caché para las siguientes.
2. **Recorte:** se recorta la imagen al contorno de la prenda (píxeles no transparentes) con un pequeño margen.
3. **Compresión:** se redimensiona a 900 px en el lado mayor y se exporta a **WebP** (calidad 0.8), con transparencia. Suelen quedar entre 20 y 80 KB por prenda. Safari, que no codifica WebP, guarda PNG.

Con 1 GB de Storage gratis en Supabase caben miles de prendas.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas `prendas`, `outfits` y `outfit_prendas` con RLS, y el bucket privado `prendas`.
3. **Project Settings → API**: copia la *Project URL* y la *anon public key*.
4. (Opcional) **Authentication → Providers → Email**: desactiva *Confirm email* para entrar sin confirmar el correo.

### 2. Local

```bash
cp .env.example .env   # y rellena las dos variables
npm install
npm run dev
```

### 3. Vercel

1. Sube el repo a GitHub e impórtalo en [vercel.com](https://vercel.com) (detecta Vite solo).
2. En **Environment Variables** añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. `vercel.json` ya incluye el rewrite SPA y las cabeceras del service worker.
4. En Supabase → **Authentication → URL Configuration**, pon tu dominio de Vercel como *Site URL*.

### 4. Cerrar el registro

Es una app personal: después de crear tu cuenta, en Supabase → **Authentication → Providers → Email** desactiva *Allow new users to sign up*.

## Instalar como app

- **iPhone:** Safari → Compartir → *Añadir a pantalla de inicio*.
- **Android:** Chrome → menú → *Instalar aplicación*.

## Estructura

```
src/
  lib/
    supabase.ts     cliente
    api.ts          CRUD de prendas/combinaciones + URLs firmadas
    image.ts        quitar fondo, recortar y comprimir
    categorias.ts   tipos de prenda y su capa en la combinación
    store.tsx       estado del armario (contexto)
  pages/            Login, Armario, NuevaPrenda, DetallePrenda, Combinaciones, Combinar
  components/       Layout, Flatlay (composición), FormPrenda, Icons
supabase/schema.sql
scripts/generate-icons.mjs   regenera los PNG de la PWA (npm run icons)
```

## Notas

- **Categorías:** se editan en `src/lib/categorias.ts`. Cada una pertenece a una capa (arriba, encima, abajo, calzado, accesorio), que decide su hueco en la composición.
- **Plan gratuito de Supabase:** el proyecto se pausa tras 7 días sin actividad. Se reactiva desde el panel.
- **Licencia:** `@imgly/background-removal` es AGPL-3.0. Para uso personal no hay problema; si algún día la publicas como producto, revisa la licencia.
