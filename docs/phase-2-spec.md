La Fase 1 queda aprobada.

Continúa únicamente con la Fase 2: configuración operativa del OWNER.

Recuerda que estamos construyendo un MVP para validar inicialmente con
1–3 barberías. No agregues funcionalidades fuera de este alcance.

OBJETIVO

Un OWNER autenticado debe poder configurar los barberos y servicios
necesarios para posteriormente registrar una visita.

Al terminar esta fase, en Sergio Barber Shop debo poder crear, editar
y desactivar barberos y servicios desde una interfaz mobile-first.

--------------------------------------------------
1. BARBEROS
--------------------------------------------------

Crear la interfaz necesaria para listar y administrar barberos.

Cada barbero tiene únicamente:

- name
- commission_rate
- is_active

El OWNER debe poder:

- ver barberos activos;
- crear un barbero;
- editar nombre;
- editar porcentaje de comisión;
- desactivar un barbero.

Ejemplo:

Carlos
Comisión: 40%

Andrés
Comisión: 50%

NO implementar:

- login de barbero;
- email;
- teléfono;
- foto;
- salario;
- propinas;
- bonos;
- metas;
- horarios;
- permisos;
- nómina;
- comisión diferente por servicio.

No borrar físicamente barberos.

Utilizar is_active = false.

Validaciones mínimas:

- nombre obligatorio;
- nombre no vacío;
- commission_rate >= 0;
- commission_rate <= 100.

--------------------------------------------------
2. SERVICIOS
--------------------------------------------------

Crear la interfaz necesaria para listar y administrar servicios.

Cada servicio tiene únicamente:

- name
- base_price
- is_active

El OWNER debe poder:

- ver servicios activos;
- crear servicio;
- editar nombre;
- editar precio;
- desactivar servicio.

Ejemplo:

Corte
$30.000

Barba
$15.000

Cejas
$8.000

NO implementar:

- categorías;
- duración;
- imágenes;
- variantes;
- impuestos;
- inventario;
- productos;
- promociones;
- comisiones por servicio.

No borrar físicamente servicios.

Utilizar is_active = false.

Los precios se almacenan como bigint en COP.

En la UI deben mostrarse formateados:

30000 → $30.000

--------------------------------------------------
3. UX / MOBILE FIRST
--------------------------------------------------

Esta fase también debe establecer el lenguaje visual inicial de
MiBarbería.

Priorizar teléfono de aproximadamente 360–430 px.

La aplicación debe sentirse sencilla, moderna y operativa.

No debe parecer:

- ERP;
- software contable;
- panel administrativo empresarial.

Usa los componentes shadcn/ui existentes cuando sean adecuados.

Evita tablas tradicionales en mobile.

Prefiere cards/listas simples.

Ejemplo conceptual:

BARBEROS

Carlos
40% comisión
                    Editar

Andrés
50% comisión
                    Editar

[ + Agregar barbero ]

En mobile, para crear/editar puedes utilizar Sheet/Drawer/Dialog
según lo que produzca la experiencia más sencilla.

No construyas un design system complejo.

--------------------------------------------------
4. NAVEGACIÓN
--------------------------------------------------

Puedes comenzar a establecer la navegación prevista:

Inicio
Visitas
Clientes
Más

Como las otras funcionalidades todavía no existen, no construyas
pantallas ficticias completas.

Dentro de "Más" deben poder encontrarse:

- Barberos
- Servicios

Puedes dejar las futuras opciones fuera hasta que sean implementadas.

--------------------------------------------------
5. SEGURIDAD
--------------------------------------------------

Mantener exactamente el aislamiento multi-tenant implementado en
Fase 1.

Todas las operaciones deben ejecutarse con la sesión OWNER y respetar
RLS.

No utilizar service_role para estas operaciones.

No crear funciones PostgreSQL para CRUD sencillo de barbers/services
salvo que exista una necesidad real que debas justificar.

Un OWNER de Barbería A nunca debe poder crear, modificar, consultar o
desactivar barberos/servicios de Barbería B.

--------------------------------------------------
6. ESTADOS IMPORTANTES
--------------------------------------------------

Implementar estados sencillos para:

- loading;
- lista vacía;
- error;
- éxito de creación/edición.

Ejemplo de empty state:

"No tienes barberos todavía"

[ Agregar primer barbero ]

y:

"No tienes servicios todavía"

[ Agregar primer servicio ]

No sobrecargar la aplicación con toasts o animaciones.

--------------------------------------------------
7. NO IMPLEMENTAR TODAVÍA
--------------------------------------------------

NO avances hacia:

- nueva visita;
- dashboard funcional;
- clientes;
- fidelización;
- Google Reviews;
- BARBER login;
- PWA;
- analytics;
- onboarding;
- billing;
- deployment remoto.

La siguiente fase será el flujo crítico de Nueva Visita, pero quiero
revisar primero esta fase.

--------------------------------------------------
8. TESTING
--------------------------------------------------

No busques maximizar artificialmente el número de tests.

Agrega solamente pruebas de valor para esta fase.

Como mínimo verifica:

- OWNER puede crear/editar/desactivar su barbero;
- OWNER puede crear/editar/desactivar su servicio;
- validaciones de comisión;
- validaciones de precio;
- aislamiento entre tenants;
- comportamiento básico mobile.

No necesitamos pruebas exhaustivas de detalles visuales.

--------------------------------------------------
9. AL FINALIZAR
--------------------------------------------------

No avances automáticamente a la siguiente fase.

Entrégame:

1. Resumen de lo implementado.
2. Archivos/módulos principales creados.
3. Cualquier migration nueva, si realmente fue necesaria.
4. Cómo implementaste CRUD de barberos y servicios.
5. Pruebas ejecutadas y resultado.
6. Cualquier desviación respecto al PRODUCT_SPEC.
7. Screenshots o descripción de las pantallas resultantes.
8. Cualquier decisión que consideres que debemos revisar antes de
   implementar Nueva Visita.

Mantén la aplicación ejecutable.

Puedes comenzar.