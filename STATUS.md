# Estado del proyecto

> Lo mantiene Claude con `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
Desplegada en https://ropa-blush.vercel.app; el login funciona, con cuenta propia y registro cerrado. Supabase reactivado y con el esquema aplicado.
Mejoras por bloques: el 1 (animaciones y transiciones) subido, sin probar en el móvil; pendientes 2 (rapidez), 3 (detalles de uso) y 4 (funciones nuevas).

## Siguientes pasos
- [ ] Comprobar el despliegue en Vercel en el móvil (instalación PWA, cámara, caché del modelo)
- [ ] Probar el bloque 1 en el móvil (Safari incluido si es iPhone)
- [ ] Bloque 2, rapidez: caché local de fotos (las URLs firmadas caducan a las 6 h), mostrar lo último guardado mientras se actualiza, recordar el filtro
- [ ] Bloque 3, detalles: panel propio en vez de confirm(), avisos breves, deshacer al borrar, color con muestras, errores en español, vestido sin parte de abajo a mano
- [ ] Bloque 4, por decidir: «Hoy me lo pongo», sugerencia, favoritas, búsqueda, compartir combinación como imagen (varias necesitan cambios en la BD)

## Última sesión

### 2026-11-24
- Arreglado el login: Supabase estaba pausado, la app llevaba una clave secreta (ya revocada) en vez de la publishable, faltaba aplicar schema.sql y la Site URL no tenía https://.
- El build falla si VITE_SUPABASE_ANON_KEY es secreta; errores de acceso en español (4646444, desplegado).
- Cuenta propia creada y registro cerrado en Supabase.
- Bloque 1: transiciones entre pantallas, foto que vuela al detalle, fundido de fotos, filtros y dado animados, progreso al quitar fondo, indicador en botones.
- Probado en Edge sin ventana con un Supabase simulado, más un quitado de fondo con el modelo real.

### 2026-10-26 (reconstruido desde git)
- Creación del proyecto y despliegue en Vercel.

## Decisiones
- Todo el procesado de imagen en el cliente, sin servidor ni APIs de pago.
- WebP con transparencia para que quepan miles de prendas en el 1 GB gratis de Supabase.
- Animaciones solo con CSS, View Transitions y Web Animations, sin librerías; respetan «reducir movimiento». Por eso se usa createBrowserRouter.
- Mantener la simplicidad: ni más pestañas, ni gráficas, ni pantallas de ajustes.

## Problemas conocidos

- Sin verificar en el móvil: subir una prenda de principio a fin (cámara, recorte, guardado) y las animaciones del bloque 1.
- El porcentaje de descarga del modelo usa un total estimado: puede saltar del ~91 % al final.
- Si el login dice «No se puede conectar con el servidor», Supabase está pausado: Resume project en su panel.
