# Estado del proyecto

> Lo mantiene Claude con `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
Primera versión funcional recién creada y desplegada en Vercel: alta de prendas con quitado de fondo, armario, detalle y combinaciones. Proyecto muy reciente (2 commits).

## Siguientes pasos
- [ ] Comprobar el despliegue en Vercel en el móvil (instalación PWA, cámara, caché del modelo)
- [ ] Cerrar el registro en Supabase tras crear la cuenta propia (Allow new users to sign up → off)
- [ ] Decidir siguientes funciones (filtros, búsqueda, estadísticas de uso…)

## Última sesión
### 2026-10-26 (reconstruido desde git)
- Creación del proyecto y despliegue en Vercel.

## Decisiones
- Todo el procesado de imagen en el cliente, sin servidor ni APIs de pago.
- WebP con transparencia para que quepan miles de prendas en el 1 GB gratis de Supabase.

## Problemas conocidos
