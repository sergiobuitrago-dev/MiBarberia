# Primera barbería y OWNER

## A. Preparar un proyecto remoto gratuito

Usar un proyecto dedicado al piloto, en una organización Free. Todas las barberías
comparten ese proyecto y se aíslan mediante RLS; no hace falta un proyecto por local.

1. Crear el proyecto en Supabase y guardar la contraseña de base de datos en tu
   gestor de contraseñas. No pegarla en código ni en el chat.
2. En Authentication, desactivar **Allow new users to sign up** y acceso anónimo.
3. Mantener **Email** habilitado como proveedor de autenticación. Desactivar el
   registro NO significa desactivar el proveedor Email.
4. En URL Configuration, establecer Site URL en `http://localhost:3000` durante
   desarrollo; cambiarlo al dominio de Vercel cuando exista despliegue.
5. Mantener el esquema `public` accesible por Data API. NO exponer `private`.
6. En Connect/API Keys, copiar Project URL y **publishable key** a `.env.local`.

El archivo `supabase/config.toml` controla el stack LOCAL. No configura
automáticamente estos ajustes del proyecto hospedado.

## B. Aplicar las migraciones

Desde la raíz del repositorio:

```sh
npm ci
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase migration list --linked
```

`TU_PROJECT_REF` es el identificador del proyecto, visible en su URL del dashboard.
La CLI pedirá la autenticación/contraseña necesaria; no la añadas a comandos que
queden en el historial. Verifica que sea el proyecto del piloto antes de aplicar.

Deben aparecer estas dos versiones aplicadas:

- `20260929032903_initial_schema.sql`
- `20260929033048_owner_rls.sql`

Alternativa si usas solamente SQL Editor: ejecutar ambos archivos completos y en
ese orden como administrador. Esto crea el schema, pero NO registra su historial
en la CLI; no mezclar después `db push` sin reconciliar ese historial. Se recomienda
usar la CLI o el plugin con migraciones registradas.

## C. Crear el usuario

1. Abrir **Authentication → Users → Add user → Create new user**.
2. Introducir el correo real del propietario y una contraseña segura (al menos
   12 caracteres recomendados). El propietario necesitará esas credenciales.
3. Marcar **Auto Confirm User** / confirmar el correo, porque el piloto usa
   provisionamiento manual y no necesita envío de correo para el primer acceso.
4. No añadir roles a `user_metadata`: los permisos se asignan en la tabla de
   membresías, no en metadata editable por el usuario.

Estos pasos también funcionan en Studio local: http://127.0.0.1:54323.
Crear usuarios por la vía administrativa sigue permitido con el registro público
desactivado. No insertar contraseñas ni usuarios de producción directamente en SQL.

## D. Crear la barbería y vincular OWNER

1. Abrir `supabase/manual/provision-owner.sql`.
2. Reemplazar `CAMBIAR_CORREO_OWNER` por el correo del usuario creado.
3. Reemplazar `CAMBIAR_NOMBRE_BARBERIA` por el nombre real de la barbería.
4. Pegar y ejecutar el bloque completo en **SQL Editor** como administrador.

El bloque comprueba que el usuario exista y tenga correo confirmado; crea la
barbería con COP/America/Bogota y su membresía OWNER atómicamente. Si falla, no deja
una barbería a medias. Si el usuario ya tiene una membresía OWNER, aborta para
evitar duplicar la barbería al repetir el script. No crea barberos, servicios,
clientes ni datos ficticios de ventas.

Verificar como administrador:

```sql
select s.id, s.name, s.currency_code, s.timezone, u.email, m.role
from public.barbershops s
join public.barbershop_users m on m.barbershop_id = s.id
join auth.users u on u.id = m.user_id
where u.email = 'CORREO_REAL_DEL_OWNER';
```

## E. Comprobar acceso

```sh
npm run dev
```

Abrir http://localhost:3000 e ingresar las credenciales. Deben aparecer el nombre
de la barbería, correo de la cuenta y “Acceso de propietario verificado”. Cerrar
sesión y abrir `/` de nuevo: debe redirigir al login.

Para otra barbería, repetir C y D con otro OWNER. No crear membresías BARBER todavía.
No hay pantalla de administración de usuarios ni registro público.

## Alcance verificado

La implementación y las pruebas usan Supabase LOCAL. Ningún proyecto remoto fue
creado ni modificado desde esta sesión. El plugin figuraba instalado, pero no
exponía herramientas Supabase; el permiso de acceso al dashboard por navegador
fue rechazado. Cuando la conexión del plugin esté disponible podrá aplicarse este
mismo esquema al proyecto real, sin pedir contraseñas administrativas en el chat.
