# Home operacional + comisiones semanales

> Ejecución local en esta sesión con pruebas primero (superpowers:executing-plans).

## Objetivo y contrato aprobado

Mejorar Home y consultar comisiones semanales OWNER sobre visitas ACTIVE. PostgreSQL
calcula tenant, tiempo America/Bogota y agregados; Next.js presenta. Conservar snapshots,
RLS, importes decimales exactos y tokens carbon/brass. Sin tablas nuevas ni contabilidad.
La especificación es la solicitud completa y el checkpoint aprobado en este chat.

## Límites operativos

- Rama local codex/home-comisiones, mismo checkout para reutilizar entorno local.
- No commit, push, Cloud ni deployment durante esta fase.
- Publicación posterior: Migration 7 Cloud → verificar historial/RPCs → commit aprobado
  → push a producción con aprobación explícita → Netlify automático → build y smoke test.
- No modificar las seis migraciones anteriores ni reparar historial.

## Tareas

- [x] 1. Datos: ampliar tests/dashboard.test.mjs y crear tests/commissions.test.mjs;
  comprobar rojo. Generar migration 7 con CLI: get_dashboard añade daily_sales
  [{date,sales}], siete días locales independientes del selector. Crear
  get_weekly_commissions(p_week_date date=null,p_barber_id uuid=null,p_page integer=1).
  Respuesta: timezone, week_start, week_end, previous_week, next_week, is_current,
  barbers [{id,name,visits,production,commission}], barber (mismo resumen o null),
  visits [{id,visited_at,total,commission,services:string[]}], page, has_more.
  SECURITY INVOKER, OWNER derivado, semanas [lunes,lunes), detalle 25 registros,
  totales completos. Aplicar solo local y comprobar verde. Regenerar tipos locales.
- [x] 2. Presentación: tests de escala SVG y parámetros de semana; luego implementar
  gráfica server-side, cuatro cards y card de producción compartida. Añadir páginas
  /comisiones y /comisiones/[barberId], navegación semanal por fechas devueltas por DB.
  Sin cálculo de límites temporales en cliente. Reutilizar Button/Input/cop.
- [x] 3. Navegación: Inicio/Visitas/Comisiones/Más, Clientes y cuenta en Más;
  mantener rutas, estado activo, safe-area y alturas táctiles. Revalidar comisiones
  desde acciones de visitas. Actualizar tests de navegación afectados.
- [x] 4. Validación: lint, typecheck, build, suite Node y Playwright completa;
  capturas y revisión visual 360/390/430 y desktop. Comprobar recuperación de errores,
  vacío, teclado, sin scroll horizontal y dinero sin truncar. Auditoría UI y revisión
  final independiente. Registrar evidencia y actualizar DESIGN.md/UX-CONTRACT.md.

## Casos de revisión

- Medianoche local, microsegundo final del domingo y cruce de año: tests SQL.
- Barbero inactivo y cambio de comisión actual: snapshots en tests SQL/UI.
- Dinero agregado superior a Number.MAX_SAFE_INTEGER: strings/BigInt, escala acotada.
- Un pico, siete ceros, nombres largos y periodo vacío con ventas recientes: UI móvil.
- IDs ajenos, anónimo/no OWNER, fechas/páginas inválidas y semanas sin actividad: SQL/UI.

## Registro

- Repositorio limpio al comenzar. Docker apagado; iniciado para pruebas locales.
- No hay dependencias de gráficas. Se conserva SVG propio sin nuevas dependencias.

- Datos: rojo inicial por RPC/serie inexistentes; verde después de migration 7 local.
- Se corrigió alias SQL reservado antes de aplicar y una expectativa aritmética del test
  (26 × 3.602.879.701.896.396 + 12.000 = 93.674.872.249.318.296).
- Presentación: pruebas rojas por módulos ausentes y navegación aún inexistente; verdes
  después de implementación. Rango corto usa partes de Intl para evitar diferencias ICU.
- Revisión independiente: patrón de revalidación corregido a /(owner)/comisiones (layout),
  contrastado con getImplicitTags de Next instalado. Sin otros hallazgos accionables.
- Final: 121 pruebas Node y 25 E2E, lint/typecheck/build correctos. Ver phase-6-verification.md.
- Se conserva rama local sin commits, push, Cloud ni deployment, por instrucción explícita.
