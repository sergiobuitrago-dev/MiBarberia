La Fase 2 queda aprobada.

Antes de continuar, queda confirmada esta regla:

COMMISSION ROUNDING

La comisión se calcula sobre total_amount DESPUÉS del descuento:

commission_amount =
round(total_amount::numeric * commission_rate / 100)::bigint

Trabajamos en COP enteros.

Ejemplo:

total_amount = 35000
commission_rate = 33.33

resultado matemático = 11665.50
commission_amount = 11666
barbershop_amount = 23334

barbershop_amount NO necesita almacenarse.
Se deriva:

total_amount - commission_amount


==================================================
FASE 3 — NUEVA VISITA
==================================================

Esta es la funcionalidad más importante de MiBarbería.

No la trates como un formulario administrativo tradicional.

El OWNER podría utilizar esta pantalla muchas veces durante un día de
trabajo, normalmente desde su teléfono.

La prioridad es:

VELOCIDAD + CLARIDAD + POCOS TOQUES.

Principio del producto:

"Una visita. Un registro. Todo lo demás se calcula."


==================================================
1. OBJETIVO END-TO-END
==================================================

Al terminar esta fase debe funcionar completamente:

OWNER inicia sesión
        ↓
Nueva visita
        ↓
Selecciona/crea cliente o cliente ocasional
        ↓
Selecciona barbero
        ↓
Selecciona uno o varios servicios
        ↓
Opcionalmente modifica precios
        ↓
Opcionalmente aplica descuento
        ↓
Selecciona método de pago
        ↓
Ve total
        ↓
Registrar visita
        ↓
La operación se persiste correctamente
        ↓
Pantalla de éxito

NO implementar todavía el dashboard completo.

Sí debe quedar la visita persistida correctamente para que el dashboard
pueda consumirla en la siguiente fase.


==================================================
2. CLIENTE
==================================================

La visita puede tener:

A) Cliente existente
B) Cliente nuevo
C) Cliente ocasional

Cliente existente:

Permitir buscar por:

- nombre;
- teléfono.

Ejemplo:

[ Buscar cliente... ]

Juan Pérez
300 123 4567
5 visitas

Seleccionar → customer_id correspondiente.


CLIENTE NUEVO

Debe poder crearse rápidamente durante el registro.

Únicamente:

Nombre *
Teléfono opcional

NO navegar a otra sección para crear el cliente.

El cliente debe crearse como parte de la operación de registrar visita.


CLIENTE OCASIONAL

Debe existir una opción clara:

"Cliente ocasional"

Resultado:

customer_id = NULL

No crear un registro customer artificial.


==================================================
3. BARBERO
==================================================

Mostrar solamente:

is_active = true

Seleccionar exactamente UN barbero.

Ejemplo:

¿Quién atendió?

[ Carlos ]
[ Andrés ]
[ Miguel ]

La interacción debe ser rápida en mobile.

Al seleccionar el barbero, la aplicación NO debe pedir comisión.

La comisión viene automáticamente de:

barbers.commission_rate


==================================================
4. SERVICIOS
==================================================

Mostrar solamente servicios activos.

Debe poder seleccionarse uno o varios.

Ejemplo conceptual:

Servicios

[ Corte            $30.000 ]
[ Barba            $15.000 ]
[ Cejas             $8.000 ]

Al seleccionar:

✓ Corte             $30.000
✓ Barba             $15.000

Subtotal            $45.000


Debe existir AL MENOS un servicio para registrar la visita.


==================================================
5. PRECIO EDITABLE
==================================================

El precio inicial viene de:

services.base_price

Pero el OWNER puede modificar el precio únicamente para esta visita.

Ejemplo:

Corte

Catálogo: $30.000
Cobrado:  [ $25.000 ]


Esto NO debe modificar services.base_price.


Al persistir VISIT_ITEM guardar snapshot:

service_id
service_name
catalog_price
charged_price


==================================================
6. DESCUENTO
==================================================

Mantener extremadamente sencillo.

Para este MVP implementar únicamente DESCUENTO EN VALOR COP.

NO implementar porcentaje.

Ejemplo:

Subtotal:       $45.000
Descuento:      $5.000
──────────────────────
Total:          $40.000


Esto simplifica tanto UI como reglas.

Reglas:

discount_amount >= 0
discount_amount <= subtotal_amount

NO implementar:

- cupones;
- promociones;
- códigos;
- porcentaje;
- reglas automáticas.


==================================================
7. MÉTODO DE PAGO
==================================================

Exactamente uno:

CASH       → Efectivo
TRANSFER   → Transferencia
CARD       → Tarjeta
OTHER      → Otro


En mobile prefiero botones/opciones visibles sobre un select tradicional
si la UX sigue siendo limpia.

NO pagos mixtos.


==================================================
8. RESUMEN
==================================================

Antes de registrar debe quedar extremadamente claro:

Subtotal
Descuento
Total

Ejemplo:

Subtotal               $45.000
Descuento                $5.000
────────────────────────────────
Total                   $40.000


La comisión NO necesita ocupar espacio protagonista en esta pantalla.

El OWNER está registrando una visita, no liquidando al barbero.

Puede mostrarse discretamente si mejora la experiencia, pero no debe
añadir ruido.


==================================================
9. CREACIÓN TRANSACCIONAL
==================================================

Implementar ahora la operación transaccional de creación de visita.

Esta es una de las pocas operaciones donde SÍ queremos una función
PostgreSQL/RPC porque necesitamos atomicidad.

Propón/implementa:

create_visit(...)


Debe ejecutarse como una sola transacción lógica.

Responsabilidades del servidor/database:

1. Verificar usuario autenticado.
2. Verificar que sea OWNER de la barbería.
3. Determinar la barbería autorizada.
4. Validar barber_id.
5. Confirmar que el barbero pertenece a esa barbería.
6. Confirmar que el barbero está activo.
7. Validar service_ids.
8. Confirmar que todos pertenecen a la misma barbería.
9. Confirmar que estén activos.
10. Obtener service_name y base_price desde database.
11. Obtener commission_rate desde database.
12. Crear customer si se proporcionó uno nuevo.
13. Calcular subtotal.
14. Validar descuento.
15. Calcular total.
16. Calcular comisión con la regla confirmada.
17. Insertar VISIT.
18. Insertar VISIT_ITEMS.
19. Devolver la visita creada.

Si cualquier paso falla:

NO debe quedar:

- customer huérfano;
- visit parcial;
- visit_items parciales.

Todo debe revertirse.


==================================================
10. NO CONFIAR EN EL CLIENTE
==================================================

La UI puede calcular totales para feedback inmediato.

Pero la base de datos/operación server-side es la autoridad.

NO aceptar desde el navegador como valores confiables:

- barbershop_id;
- commission_rate;
- commission_amount;
- subtotal_amount;
- total_amount;
- service_name;
- catalog_price.

Estos deben derivarse o validarse server-side.


El navegador sí puede enviar:

- customer existente o datos de nuevo cliente;
- barber_id;
- service_id;
- charged_price;
- discount_amount;
- payment_method.


==================================================
11. SNAPSHOTS
==================================================

Guardar correctamente:

VISIT

barber_id
commission_rate
commission_amount


VISIT_ITEM

service_id
service_name
catalog_price
charged_price


Cambios posteriores al catálogo o comisión NO deben modificar esta visita.


==================================================
12. FECHA
==================================================

visited_at debe asignarse server-side al momento de registrar.

Para esta fase NO necesitamos permitir al OWNER seleccionar manualmente
una fecha histórica.

La visita ocurre "ahora".

Usar timestamptz.

La presentación posteriormente utilizará timezone de la barbería.


==================================================
13. NOTES
==================================================

El schema ya permite notes.

No considero necesario mostrarlo en el flujo principal del MVP.

Puedes dejar notes = NULL.

No agregues un campo simplemente porque existe en database.


==================================================
14. PANTALLA DE ÉXITO
==================================================

Después de registrar:

✓ Visita registrada


Ejemplo:

Juan Pérez

Corte + Barba

Total
$45.000

Carlos · Efectivo


[ Registrar otra visita ]

[ Ver visita ]


Si fue cliente ocasional:

Cliente ocasional


NO implementar todavía:

- Google Reviews;
- fidelización;
- WhatsApp;
- impresión;
- recibos;
- compartir.


==================================================
15. PREVENIR DOBLE REGISTRO
==================================================

Al presionar:

"Registrar visita"

deshabilitar inmediatamente la acción mientras se procesa.

Mostrar estado:

"Registrando..."

Evitar doble submit accidental.

No necesitamos todavía infraestructura sofisticada de idempotency keys
salvo que identifiques una razón real.

Priorizar solución simple.


==================================================
16. ERRORES
==================================================

Errores deben ser comprensibles.

Ejemplos:

"Selecciona un barbero"

"Selecciona al menos un servicio"

"El descuento no puede superar el subtotal"

"No pudimos registrar la visita. Intenta nuevamente."


No mostrar mensajes internos de PostgreSQL/Supabase al usuario.


==================================================
17. MOBILE FIRST
==================================================

Esta pantalla debe diseñarse primero para 360–430px.

Quiero que pruebes específicamente:

- 360px
- 390px
- 430px


Evitar una experiencia tipo formulario administrativo:

Cliente
<select>

Barbero
<select>

Servicios
<select>


Prefiero interacción visual/touch-friendly.

Ejemplo conceptual, NO diseño obligatorio:


Nueva visita

Cliente
[ Buscar nombre o teléfono ]

[ + Cliente nuevo ]   [ Ocasional ]


¿Quién atendió?

[ Carlos ]
[ Andrés ]
[ Miguel ]


Servicios

[ Corte     $30.000 ]
[ Barba     $15.000 ]
[ Cejas      $8.000 ]


Seleccionados

Corte                   $30.000
Barba                   $15.000


Descuento
[ $ 0 ]


Total
$45.000


¿Cómo pagó?

[ Efectivo ]
[ Transferencia ]
[ Tarjeta ]
[ Otro ]


[ REGISTRAR VISITA ]


==================================================
18. PERFORMANCE
==================================================

No sobreoptimizar.

Tenemos 1–3 barberías.

Carga solamente:

- barberos activos;
- servicios activos;
- resultados necesarios de clientes.

La búsqueda de clientes no debe descargar toda la base al navegador si
puede evitarse razonablemente.

No introducir Redis/cache/search engines.


==================================================
19. EDICIÓN / ANULACIÓN
==================================================

IMPORTANTE:

Aunque el modelo contempla update_visit y void_visit, NO quiero mezclar
demasiado alcance en esta fase.

Prioridad:

CREATE VISIT impecable.


Implementa detalle básico "Ver visita" si es necesario para completar
el flujo.

Antes de implementar edición/anulación completa, evalúa si aumenta
demasiado esta fase.

Si es así, déjalas para una Fase 3B separada.

NO sacrifiques calidad del flujo de registro por implementar edición.


==================================================
20. TESTS
==================================================

Priorizar pruebas de lógica crítica.

Como mínimo:

- crear visita ocasional;
- crear visita con cliente existente;
- crear visita creando cliente;
- múltiples servicios;
- precio personalizado;
- descuento;
- comisión;
- rounding;
- snapshots;
- rechazo de barbero de otra barbería;
- rechazo de servicio de otra barbería;
- rechazo de entidades inactivas;
- atomicidad ante error;
- RLS / OWNER authorization;
- prevención básica de doble submit;
- flujo mobile principal.

No busques aumentar artificialmente el número total de tests.


==================================================
21. NO IMPLEMENTAR
==================================================

NO implementar todavía:

- dashboard completo;
- fidelización;
- reviews;
- edición compleja;
- pagos mixtos;
- propinas;
- impuestos;
- facturación;
- inventario;
- reservas;
- BARBER login;
- receipt/PDF;
- WhatsApp;
- PWA;
- offline;
- analytics avanzados.


==================================================
22. CRITERIO DE ÉXITO
==================================================

Esta fase está terminada cuando yo pueda hacer desde mi teléfono:

1. Login.
2. Pulsar Nueva visita.
3. Seleccionar/crear cliente o elegir ocasional.
4. Seleccionar Carlos.
5. Seleccionar Corte + Barba.
6. Ver $45.000.
7. Elegir Efectivo.
8. Pulsar Registrar visita.
9. Ver confirmación.
10. Confirmar que la visita quedó correctamente persistida.

El flujo debe sentirse suficientemente rápido como para repetirlo
muchas veces durante un día.


==================================================
23. AL TERMINAR
==================================================

No avances automáticamente.

Entrégame:

1. Resumen.
2. UX resultante.
3. Migration/RPC creada.
4. Contrato de create_visit.
5. Cómo garantizas atomicidad.
6. Cómo garantizas aislamiento tenant.
7. Cómo calculas dinero/comisión.
8. Tests ejecutados.
9. Screenshots mobile de:
   - pantalla inicial;
   - servicios seleccionados;
   - pantalla de éxito.
10. Cualquier decisión o desviación.
11. Qué propones dejar para Fase 3B.

Espera mi aprobación.