# Provisionamiento manual de barbería y OWNER

Para despliegue y configuración remota, seguir [pilot-deployment.md](pilot-deployment.md).
Hay seis migraciones; aplicarlas todas antes de provisionar. Desarrollo usa Supabase
local; piloto usa su proyecto Cloud. Nunca cambiar `.env.local` para administrar el piloto.

## 1. Confirmar destino y datos

En Studio local o en el dashboard Cloud, comprobar explícitamente el proyecto.
Preparar correo del propietario y nombre de barbería. No reutilizar datos de desarrollo.
Para piloto: registro público y acceso anónimo desactivados, proveedor Email habilitado.

## 2. Crear usuario Auth

En Authentication → Users → Add user → Create new user, introducir correo y una
contraseña segura (mínimo 12 caracteres) y confirmar el correo mediante la opción
administrativa Auto Confirm User. No usar invitación por email: no configuramos correo
transaccional en este piloto. No escribir passwords en SQL, repositorio, chat o logs.
No asignar permisos mediante user_metadata. Entregar credenciales por un canal privado.

## 3. Vincular OWNER atómicamente

Abrir `supabase/manual/provision-owner.sql`. La plantilla versionada tiene ambos
valores vacíos y falla sin cambios si se ejecuta así. En una copia NO versionada o en
SQL Editor, rellenar solamente `v_owner_email` y `v_shop_name`. Si hay apóstrofos,
escaparlos como `''` en los literales SQL. Revisar proyecto y valores antes de ejecutar.
No guardar esa copia rellenada en Git ni guardar passwords en ella.

El script rechaza vacíos, marcadores comunes y formato de correo inválido; exige
un Auth user existente y confirmado. Crea barbería (COP/America/Bogota) y membership
OWNER en una sola transacción. Rechaza un usuario que ya tenga OWNER, sin duplicar
barberías. No crea clientes, visitas, barberos, servicios ni reglas de fidelización.
Los controles no sustituyen revisar que los datos introducidos sean los reales.

## 4. Configurar la operación

Entrar como OWNER en la URL del entorno elegido. En Más → Barberos y Más → Servicios,
crear nombres, comisiones y precios acordados con el propietario. No inventar catálogos.
Si corresponde configuración de fidelización, provisionarla administrativamente en
`loyalty_programs`, con el barbershop_id recién creado y valores acordados. No hay que
crear una regla ficticia para iniciar ni implementar una nueva pantalla en esta tarea.

## 5. Comprobar

- El OWNER ve el nombre correcto de barbería.
- Barberos/Servicios muestran únicamente lo configurado para ella.
- Clientes e historial están vacíos; Dashboard sin visitas.
- Confirmar cero filas de customers, visits y visit_items para esa barbería.
- Logout y nueva entrada funcionan. No crear una visita de prueba en la barbería real.

Para 1–3 barberías, repetir con cada propietario y su correo. Mantener un OWNER con
una barbería en este piloto: no hay selector de barberías. No crear membresías BARBER.
