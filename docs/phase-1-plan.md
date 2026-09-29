# Fase 1 — Plan aprobado

Fuente: PRODUCT_SPEC.md y aprobación del usuario del 29 de septiembre de 2026.
Alcance: Next.js 16, TypeScript strict, Tailwind 4, shadcn/ui, Supabase SSR,
schema completo inicial, RLS, login OWNER y provisionamiento manual.
No implementar ninguna UI de negocio ni avanzar a Fase 2.

## Decisiones
- CRUD sencillo directo con RLS. RPC transaccionales reservadas para VISIT en Fase 3.
- En Fase 1 visits y visit_items son de solo lectura para authenticated; ninguna
  escritura pública hasta implementar atomicidad, snapshots y cálculos en Fase 3.
- Membresías administradas exclusivamente fuera de la app. Autorización en DB,
  nunca en user_metadata ni por barbershop_id suministrado por el cliente.
- No hay repositorio Git previo ni trabajo que aislar: trabajar en la carpeta vacía
  autorizada. No crear worktree ni infraestructura de revisión basada en commits.
- Ejecutar el plan directamente; la aprobación explícita para comenzar sustituye
  aprobaciones repetidas de documentos auxiliares.

## Pasos y verificación
1. Crear base ejecutable, dependencias fijadas y documentación mínima de UI.
2. Inicializar Supabase local y schema, con constraints y claves compuestas.
3. Escribir pruebas reales SQL de aislamiento; verificar fallo antes de RLS,
   aplicar políticas/grants y verificar que pasan.
4. Escribir pruebas de acceso/login con Playwright; implementar clientes SSR,
   proxy de refresco, acciones login/logout y página protegida OWNER.
5. Documentar aplicación de migraciones y provisión manual reproducible.
6. Verificar lint, typecheck, pruebas DB, E2E, build y revisar seguridad.

## Review focus
- Ninguna tabla de negocio expuesta a anon.
- OWNER A no ve/modifica B; usuario sin membresía y BARBER no operan.
- No se permite escalada de membresía ni reasignación cross-tenant.
- Claves compuestas en visitas/items; dinero entero, constraints, snapshots futuros.
- Cookies SSR refrescadas, páginas privadas sin caché, errores sin secretos.
- Pruebas de base se ejecutan como authenticated; no confundir bypass de admin con RLS.

## Evidencia
Se completará en docs/phase-1-verification.md con resultados reales.
