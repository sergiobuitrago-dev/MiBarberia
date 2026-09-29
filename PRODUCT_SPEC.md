# MiBarbería — MVP Product & Technical Specification

## 1. Tu rol

Actúa como un senior full-stack engineer responsable de implementar el MVP de **MiBarbería**.

Tu prioridad NO es construir una plataforma completa ni anticipar todos los casos futuros.

Tu prioridad es construir una aplicación:

- simple;
- mantenible;
- visualmente atractiva;
- mobile-first;
- segura;
- suficientemente robusta para ser utilizada por 1–3 barberías reales;
- rápida de modificar según feedback.

Evita sobrearquitectura.

Cuando exista una decisión entre una solución simple que funciona para el MVP y una arquitectura más sofisticada preparada para hipotéticos escenarios futuros, elige la solución simple salvo que comprometa integridad de datos, seguridad o aislamiento multi-tenant.

No agregues funcionalidades no descritas en este documento sin consultarme primero.

---

# 2. Contexto del producto

MiBarbería es una herramienta sencilla de gestión operativa para pequeñas barberías.

Actualmente muchas barberías gestionan su operación mediante una combinación de:

- memoria;
- WhatsApp;
- libretas;
- Excel;
- cálculos manuales al final del día.

Queremos que el propietario pueda responder fácilmente:

- ¿Cuánto vendí hoy?
- ¿Cuántas visitas tuve?
- ¿Cómo me pagaron?
- ¿Cuánto produjo cada barbero?
- ¿Cuánto debo pagarle en comisiones?
- ¿Qué servicios vendo más?
- ¿Cuántas veces ha venido un cliente?
- ¿Cuánto ha gastado?
- ¿Qué tan cerca está de obtener su recompensa?

El principio fundamental del producto es:

> Una visita. Un registro. Todo lo demás se calcula.

MiBarbería NO pretende convertirse inicialmente en:

- ERP;
- sistema contable;
- nómina;
- facturación electrónica;
- inventario;
- CRM avanzado;
- plataforma de reservas;
- sistema de marketing.

El MVP será probado inicialmente con solamente 1–3 barberías.

El objetivo es validar si los propietarios realmente utilizan el producto y están dispuestos a pagar por él.

---

# 3. Stack tecnológico

Utilizar:

- Next.js 16
- TypeScript
- App Router
- Tailwind CSS 4
- shadcn/ui
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Vercel

No utilizar inicialmente:

- microservicios;
- Express;
- NestJS;
- GraphQL;
- Redis;
- Kubernetes;
- Prisma;
- backend separado;
- event buses;
- CQRS;
- arquitecturas distribuidas.

La aplicación debe ser un monolito web moderno y modular.

Frontend y lógica server-side viven dentro de Next.js.

---

# 4. Plataforma

La primera versión será una aplicación web responsive y mobile-first.

NO desarrollar:

- aplicación iOS;
- aplicación Android;
- React Native;
- Flutter.

Debe funcionar especialmente bien desde un teléfono móvil.

Desktop también debe funcionar correctamente.

No implementar offline.

Asumir conexión permanente a Internet.

PWA instalable puede añadirse posteriormente, pero no es requisito inicial.

---

# 5. Multi-tenancy

MiBarbería es conceptualmente un SaaS.

Cada barbería representa un tenant.

Todas las entidades de negocio deben pertenecer explícitamente a una barbería mediante:

barbershop_id

Ejemplo:

Barbershop A
 ├── Barbers
 ├── Services
 ├── Customers
 └── Visits

Barbershop B
 ├── Barbers
 ├── Services
 ├── Customers
 └── Visits

Los datos entre barberías deben estar completamente aislados.

Utilizar Row Level Security de PostgreSQL/Supabase para garantizar este aislamiento.

NO confiar únicamente en filtros enviados desde el frontend.

Aunque inicialmente solo existirán 1–3 barberías, implementar correctamente este aislamiento desde el comienzo.

---

# 6. Usuarios y roles

Conceptualmente existirán:

OWNER
BARBER

Sin embargo:

## MVP

Solamente implementar completamente OWNER.

El OWNER puede:

- acceder al sistema;
- visualizar dashboard;
- administrar barberos;
- administrar servicios;
- registrar visitas;
- visualizar clientes;
- visualizar historial;
- configurar fidelización;
- configurar enlace de Google Reviews.

BARBER es un rol futuro.

No construir todavía:

- login específico para barberos;
- dashboard de barbero;
- permisos complejos;
- invitaciones;
- gestión avanzada de usuarios.

El modelo de datos puede contemplar BARBER como rol futuro.

---

# 7. Creación de barberías

NO implementar registro público.

NO implementar onboarding self-service.

NO implementar creación automática de organizaciones.

Durante el piloto, las 1–3 barberías serán creadas manualmente por el administrador del sistema.

Los usuarios OWNER también pueden ser creados/configurados manualmente.

No necesitamos todavía:

- planes;
- subscriptions;
- Stripe;
- trial;
- billing;
- recuperación avanzada de onboarding;
- selección de plan.

---

# 8. Flujo principal

El flujo más importante de toda la aplicación es:

Cliente
  ↓
Barbero
  ↓
Servicio(s)
  ↓
Precio
  ↓
Descuento opcional
  ↓
Método de pago
  ↓
Registrar visita

Una visita registrada alimenta automáticamente:

- ventas;
- dashboard;
- método de pago;
- producción del barbero;
- comisión;
- historial del cliente;
- fidelización;
- estadísticas de servicios.

Registrar una visita debe ser extremadamente rápido.

Minimizar clicks, formularios y decisiones innecesarias.

---

# 9. Concepto de Visit

Una VISIT representa simultáneamente:

- una visita del cliente;
- una venta.

NO crear entidades separadas como:

- Sale
- Transaction
- Income
- Order

si no son necesarias.

Una visita tiene:

- una barbería;
- opcionalmente un cliente;
- exactamente un barbero;
- uno o varios servicios;
- un método de pago;
- subtotal;
- descuento opcional;
- total;
- porcentaje de comisión;
- comisión calculada;
- fecha/hora;
- estado.

---

# 10. Clientes

No debe existir un proceso obligatorio de "crear cliente" antes de registrar una visita.

El cliente debe crearse naturalmente durante el registro.

El usuario puede:

1. buscar un cliente existente por nombre o teléfono;
2. seleccionar el cliente;
3. crear uno rápidamente;
4. registrar la visita como cliente ocasional.

Datos del cliente:

- name
- phone (opcional)

NO solicitar:

- email;
- documento;
- cumpleaños;
- dirección;
- género;
- notas CRM;
- tags.

Si se registra un cliente nuevo durante una visita, debe guardarse automáticamente.

---

# 11. Cliente ocasional

Debe poder registrarse una visita sin cliente identificado.

En base de datos:

customer_id = NULL

NO crear un cliente artificial llamado "Cliente ocasional".

Una visita sin customer_id:

SÍ cuenta para:

- ventas;
- comisión;
- dashboard;
- estadísticas;
- producción del barbero.

NO cuenta para:

- historial individual;
- fidelización individual.

---

# 12. Barberos

El OWNER puede crear barberos.

Datos iniciales:

- name
- commission_rate
- is_active

Ejemplo:

Carlos
Commission rate: 40%

Un barbero NO necesita tener usuario/login.

Debe ser posible tener cinco barberos registrados aunque solamente el OWNER tenga acceso al sistema.

---

# 13. Comisiones

Cada barbero tiene un único porcentaje de comisión.

Ejemplo:

Carlos → 40%

Si realiza:

Corte + Barba = $50.000

entonces:

Venta = $50.000
Comisión = $20.000
Para barbería = $30.000

NO implementar:

- salarios;
- propinas;
- bonos;
- metas;
- nómina;
- diferentes comisiones por servicio;
- reglas complejas de comisión.

El porcentaje NO debe preguntarse al registrar cada visita.

Se obtiene automáticamente del barbero seleccionado.

---

# 14. Snapshot de comisión

El porcentaje utilizado debe almacenarse dentro de VISIT.

Ejemplo:

commission_rate = 40.00
commission_amount = 20000

Esto es obligatorio.

Si posteriormente Carlos cambia de:

40% → 50%

las visitas históricas NO deben cambiar.

---

# 15. Servicios

El OWNER puede administrar un catálogo sencillo.

Ejemplo:

Corte          $30.000
Barba          $15.000
Cejas           $8.000

Cada servicio contiene inicialmente:

- name
- base_price
- is_active

Una visita puede contener uno o varios servicios.

---

# 16. Precio durante la venta

El precio del catálogo debe aparecer automáticamente.

Sin embargo, el OWNER puede modificar el precio para esa visita específica.

Ejemplo:

Precio catálogo:
Corte = $30.000

Precio cobrado hoy:
$25.000

Modificar el precio de la visita NO modifica el catálogo.

VISIT_ITEM debe almacenar snapshots históricos.

Guardar:

service_id
service_name
catalog_price
charged_price

Así, cambios futuros del catálogo no modifican ventas históricas.

---

# 17. Descuentos

Permitir descuento opcional durante la visita.

Mantenerlo sencillo.

Debe poder representarse al menos el valor final descontado mediante:

discount_amount

No construir un motor de promociones.

No implementar:

- coupons;
- campaigns;
- discount rules;
- customer segments;
- promotional engines.

---

# 18. Métodos de pago

Solamente:

CASH
TRANSFER
CARD
OTHER

UI:

Efectivo
Transferencia
Tarjeta
Otro

Nequi, Daviplata y transferencias bancarias pueden considerarse TRANSFER.

Una visita solamente puede tener UN método de pago.

NO implementar pagos mixtos.

---

# 19. Colombia

Mercado inicial:

Colombia.

Moneda:

COP.

Timezone por defecto:

America/Bogota

Barbershop debe conservar:

currency_code = "COP"
timezone = "America/Bogota"

Los valores monetarios NO deben almacenarse como float.

Utilizar integers/bigint.

Ejemplo:

$35.000 COP → 35000

No implementar impuestos, IVA, retenciones o facturación electrónica.

---

# 20. Dashboard

Al entrar, el OWNER debe poder entender inmediatamente qué está pasando en su barbería.

Periodo predeterminado:

HOY

Permitir:

- Hoy
- Esta semana
- Este mes
- Personalizado

Mostrar:

## Métricas principales

Ventas

Número de visitas

Comisiones

Para barbería

Donde:

Para barbería = Ventas - Comisiones

NO llamarlo "ganancia neta".

---

# 21. Métodos de pago

Mostrar desglose del periodo.

Ejemplo:

Efectivo        $285.000
Transferencia   $150.000
Tarjeta          $50.000

---

# 22. Producción por barbero

Ejemplo:

Carlos
7 visitas
$250.000 producido
$100.000 comisión

Andrés
4 visitas
$140.000 producido
$56.000 comisión

---

# 23. Top servicios

Mostrar servicios más vendidos durante el periodo.

Ejemplo:

Corte     12
Barba      7
Cejas      3

Mantenerlo sencillo.

No construir analytics avanzado.

---

# 24. No almacenar métricas derivadas

NO almacenar:

customers.total_visits
customers.total_spent
barbers.total_sales
barbers.total_commissions
barbershops.daily_sales

Calcular desde VISITS y VISIT_ITEMS.

Ejemplos:

COUNT(visits)
SUM(visits.total_amount)
SUM(visits.commission_amount)

Esto evita duplicación y problemas de sincronización.

---

# 25. Perfil del cliente

El perfil debe mostrar:

- nombre;
- teléfono;
- cantidad de visitas;
- gasto acumulado;
- última visita;
- progreso de fidelización;
- historial de visitas.

Ejemplo:

Juan Pérez
300 123 4567

6 visitas
$210.000 gastados
Última visita: 28 Sep

Fidelización:
5 / 6

Historial:

28 Sep
Corte + Barba
$45.000
Carlos

14 Sep
Corte
$30.000
Carlos

Mantener la pantalla sencilla.

---

# 26. Fidelización

Cada barbería puede configurar:

required_visits
reward_description

Ejemplo:

required_visits = 6
reward_description = "Corte gratis"

Cada visita ACTIVE asociada a un cliente suma una visita.

Ejemplo:

★★★★★☆
5 de 6 visitas

Te falta 1 visita.

Próxima recompensa:
Corte gratis

NO implementar todavía:

- puntos;
- niveles;
- múltiples rewards;
- expiration;
- promociones;
- Wallet;
- NFC;
- ledger de puntos;
- reglas complejas.

El MVP solamente debe demostrar claramente el concepto.

No sobreconstruir todavía el proceso de redemption.

---

# 27. Google Reviews

Cada barbería puede almacenar:

google_review_url

Después de registrar una visita, mostrar una pantalla/estado de éxito.

Ejemplo:

✓ Visita registrada

Juan Pérez
Corte + Barba
$45.000

Fidelización:
5 de 6

[ Pedir reseña ]

[ Registrar otra visita ]

"Pedir reseña" abre google_review_url.

NO implementar:

- SMS;
- WhatsApp automático;
- campañas;
- seguimiento de reseñas;
- automatizaciones.

---

# 28. Edición y anulación

Las visitas pueden:

- editarse;
- anularse.

NO borrar físicamente visitas.

Estados iniciales:

ACTIVE
VOIDED

Una visita VOIDED:

- permanece en base de datos;
- NO participa en dashboard;
- NO participa en comisiones;
- NO participa en fidelización;
- NO participa en estadísticas.

Guardar:

created_at
updated_at
voided_at

Si una visita ACTIVE se edita, sus cálculos deben actualizarse correctamente.

---

# 29. Modelo de datos inicial

## barbershops

id uuid PK
name text
currency_code char(3) default 'COP'
timezone text default 'America/Bogota'
google_review_url text nullable
created_at timestamptz

---

## barbershop_users

id uuid PK
barbershop_id uuid FK
user_id uuid FK -> auth.users
role OWNER | BARBER
created_at timestamptz

UNIQUE(barbershop_id, user_id)

---

## barbers

id uuid PK
barbershop_id uuid FK
name text
commission_rate numeric(5,2)
is_active boolean default true
created_at timestamptz
updated_at timestamptz

---

## services

id uuid PK
barbershop_id uuid FK
name text
base_price bigint
is_active boolean default true
created_at timestamptz
updated_at timestamptz

---

## customers

id uuid PK
barbershop_id uuid FK
name text
phone text nullable
created_at timestamptz
updated_at timestamptz

---

## visits

id uuid PK
barbershop_id uuid FK
customer_id uuid nullable FK
barber_id uuid FK

payment_method
subtotal_amount bigint
discount_amount bigint default 0
total_amount bigint

commission_rate numeric(5,2)
commission_amount bigint

status ACTIVE | VOIDED

notes text nullable

visited_at timestamptz
created_at timestamptz
updated_at timestamptz
voided_at timestamptz nullable

---

## visit_items

id uuid PK
barbershop_id uuid FK
visit_id uuid FK
service_id uuid FK

service_name text
catalog_price bigint
charged_price bigint

created_at timestamptz

---

## loyalty_programs

id uuid PK
barbershop_id uuid FK
required_visits integer
reward_description text
is_active boolean default true
created_at timestamptz
updated_at timestamptz

UNIQUE(barbershop_id)

---

# 30. Seguridad

Implementar Supabase RLS.

Un OWNER solamente puede acceder a información perteneciente a las barberías a las que está asociado mediante barbershop_users.

Aplicar RLS como mínimo sobre:

- barbershops;
- barbers;
- services;
- customers;
- visits;
- visit_items;
- loyalty_programs.

Nunca aceptar un barbershop_id proveniente del cliente como prueba suficiente de autorización.

Validar relaciones cross-tenant.

Ejemplo:

Una visita de Barbershop A nunca puede utilizar:

barber_id perteneciente a Barbershop B

aunque alguien manipule manualmente el request.

Seguridad multi-tenant es uno de los pocos aspectos del MVP donde NO debemos tomar atajos.

---

# 31. UX

Prioridad absoluta:

MOBILE FIRST.

Diseñar primero aproximadamente para:

360px–430px

y posteriormente adaptar desktop.

El flujo de nueva visita debe poder utilizarse cómodamente con una mano desde teléfono.

Utilizar:

- botones grandes;
- inputs claros;
- buen contraste;
- pocos pasos;
- feedback inmediato;
- componentes touch-friendly.

Evitar:

- tablas gigantes en móvil;
- modales innecesarios;
- formularios largos;
- menús complejos;
- navegación profunda.

La aplicación debe sentirse más cercana a una herramienta operativa moderna que a un ERP.

---

# 32. Navegación inicial

Mantener navegación pequeña.

Propuesta:

Inicio
Visitas
Clientes
Más

Dentro de "Más":

- Barberos
- Servicios
- Fidelización
- Configuración

Debe existir una acción muy visible:

+ Nueva visita

Especialmente desde mobile.

No agregar módulos innecesarios.

---

# 33. Diseño visual

La aplicación debe sentirse:

- sencilla;
- moderna;
- profesional;
- rápida;
- amigable.

Evitar apariencia de:

- software contable;
- ERP;
- dashboard empresarial complejo.

Utilizar shadcn/ui como base.

Crear un design system mínimo consistente para:

- typography;
- spacing;
- cards;
- buttons;
- inputs;
- dialogs/drawers;
- badges;
- estados.

No construir un design system complejo desde cero.

---

# 34. Arquitectura de código

Mantener estructura clara y pragmática.

Ejemplo conceptual:

app/
components/
features/
lib/
types/

Organizar lógica de negocio por dominio cuando tenga sentido:

features/
  visits/
  customers/
  barbers/
  services/
  dashboard/
  loyalty/

Evitar abstracciones prematuras.

No crear repositories/services/use-cases/interfaces/factories para operaciones triviales únicamente para seguir patrones arquitectónicos.

Extraer lógica cuando exista una razón real.

---

# 35. Lógica crítica

La creación/edición de una visita es una operación importante.

Debe garantizarse que:

subtotal_amount =
SUM(charged_price)

total_amount =
subtotal_amount - discount_amount

commission_amount =
total_amount * commission_rate / 100

Aplicar reglas consistentes de rounding.

Nunca confiar en totales calculados únicamente por el navegador.

El servidor/database debe validar o calcular los valores importantes.

---

# 36. Integridad de datos

Agregar constraints razonables.

Ejemplos:

base_price >= 0

charged_price >= 0

discount_amount >= 0

discount_amount <= subtotal_amount

total_amount >= 0

commission_rate >= 0
commission_rate <= 100

required_visits > 0

Evitar datos imposibles.

---

# 37. Performance

NO optimizar prematuramente.

Estamos diseñando para 1–3 barberías piloto.

Sin embargo:

- evitar N+1 queries evidentes;
- crear índices básicos sobre foreign keys;
- indexar campos utilizados frecuentemente para filtros;
- paginar historiales si es necesario;
- no traer datasets completos innecesariamente.

No implementar caching complejo inicialmente.

PostgreSQL/Supabase debe ser más que suficiente para esta escala.

---

# 38. Fuera de alcance

NO construir durante este MVP salvo instrucción explícita:

- App Store;
- Play Store;
- offline;
- reservas;
- calendario;
- inventario;
- facturación electrónica;
- DIAN;
- contabilidad;
- nómina;
- salarios;
- propinas;
- bonos;
- metas;
- gastos;
- proveedores;
- productos;
- múltiples sucursales;
- múltiples monedas operativas;
- pagos mixtos;
- pasarela de pagos;
- suscripciones;
- Stripe;
- WhatsApp automation;
- SMS;
- email marketing;
- CRM avanzado;
- campañas;
- promociones avanzadas;
- QR loyalty;
- NFC;
- Apple Wallet;
- Google Wallet;
- analytics avanzado;
- AI;
- exportaciones complejas;
- PDF;
- Excel;
- microservicios.

Si parece útil agregar alguno, NO implementarlo automáticamente.

Preguntar primero.

---

# 39. Estrategia de implementación

No construir todo simultáneamente.

Trabajar mediante vertical slices funcionales.

## Fase 1 — Foundation

Crear:

- Next.js project;
- TypeScript;
- Tailwind;
- shadcn/ui;
- Supabase;
- environments;
- migrations;
- authentication;
- multi-tenancy;
- RLS.

Mantenerlo mínimo.

## Fase 2 — Setup de barbería

Implementar:

- barbers;
- services;
- commission_rate;
- configuración básica.

## Fase 3 — Core vertical slice

Implementar:

Login
 ↓
Nueva visita
 ↓
Guardar visita
 ↓
Calcular comisión
 ↓
Mostrar en dashboard

Esta es la primera versión que debe funcionar end-to-end.

## Fase 4 — Clientes

Implementar:

- búsqueda;
- creación rápida;
- cliente ocasional;
- perfil;
- historial.

## Fase 5 — Fidelización

Implementar:

- configuración;
- contador;
- progreso visual;
- recompensa textual.

## Fase 6 — Reviews

Implementar:

- google_review_url;
- acción "Pedir reseña".

## Fase 7 — Polish

Optimizar:

- mobile UX;
- loading states;
- empty states;
- validation;
- error handling;
- responsive desktop;
- visual consistency.

---

# 40. Criterio para considerar exitoso el MVP

El MVP NO será exitoso por cantidad de funcionalidades.

Será exitoso si podemos entregar la aplicación a 1–3 barberías reales y estas pueden utilizarla diariamente sin nuestra intervención constante.

Un OWNER debe poder:

1. entrar desde su celular;
2. registrar sus barberos;
3. registrar servicios;
4. registrar una visita rápidamente;
5. ver inmediatamente cómo afecta sus ventas;
6. ver cuánto produjo cada barbero;
7. ver cuánto corresponde en comisiones;
8. consultar clientes recurrentes;
9. visualizar fidelización;
10. pedir una reseña.

El objetivo empresarial es aprender:

- ¿registran todas sus visitas?
- ¿lo usan diariamente?
- ¿el dashboard les resulta útil?
- ¿las comisiones eliminan cálculos manuales?
- ¿utilizan clientes/fidelización?
- ¿qué partes ignoran?
- ¿qué solicitan repetidamente?
- ¿estarían dispuestos a pagar?

No optimizar el producto para hipotéticos miles de usuarios antes de responder estas preguntas.

---

# 41. Principios para trabajar conmigo

Antes de implementar una funcionalidad importante:

1. Revisa este documento.
2. Identifica si pertenece al MVP.
3. Si requiere agregar alcance, pregúntame.
4. Prefiere la implementación más sencilla que satisfaga correctamente el requisito.
5. No sacrifiques seguridad multi-tenant ni integridad de datos.
6. No introduzcas dependencias sin una razón clara.
7. No implementes features "por si acaso".
8. Mantén migrations y schema reproducibles.
9. Mantén TypeScript strict.
10. Mantén el código comprensible para un solo desarrollador.

Cuando propongas una nueva librería:
- explica brevemente para qué sirve;
- verifica que realmente sea necesaria;
- evita agregarla si Next.js, Supabase o una dependencia existente ya resuelve el problema.

---

# 42. Instrucción inicial

NO empieces implementando toda la aplicación.

Primero:

1. Analiza esta especificación.
2. Propón la estructura mínima del repositorio.
3. Propón el schema SQL inicial de PostgreSQL/Supabase.
4. Propón las políticas RLS necesarias.
5. Propón las rutas/pantallas mínimas.
6. Propón un plan de implementación incremental.
7. Identifica solamente decisiones BLOQUEANTES que todavía necesiten confirmación.

No inventes funcionalidades adicionales.

No conviertas este MVP en una plataforma empresarial.

El objetivo inmediato es poner una primera versión funcional en manos de 1–3 barberías tan pronto como sea razonablemente posible.

Después de presentar el plan, espera mi aprobación antes de comenzar cambios estructurales importantes.