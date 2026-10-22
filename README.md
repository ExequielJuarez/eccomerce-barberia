# Barba Black · Tienda y turnos

Tienda online de insumos de peluquería y barbería, con reserva de turnos en un link propio (`/turnos`). Hecha con Node.js, Express, EJS, Sequelize y MySQL, sobre la estructura de `carpeta-base`.

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run db:instalar
npm run dev
```

Completá en `.env` los datos de conexión a MySQL (`DB_*`) y, si querés, los del negocio (`TIENDA_*`). Con `npm run db:vacia` se crea la estructura sin productos de ejemplo.

## Usuarios de prueba

| Rol | Email | Clave |
| --- | --- | --- |
| Cliente | demo@tienda.com | Demo1234 |
| Admin | admin@tienda.com | Admin1234 |
| Superadmin | super@tienda.com | Super1234 |

Con `NODE_ENV=production` no se muestran en el login.

## Turnos

- Página pública para reservar: `/turnos` (sin cuenta, con código de seguimiento para consultar o cancelar).
- Agenda del día: `/admin/turnos`.
- Servicios, horarios, equipo y días cerrados: `/admin/turnos/config`. Ahí mismo está el link para compartir con los clientes.

## Estructura

```
src/
  app.js
  controllers/  routes/  services/  validations/  middlewares/  helpers/  data/
  model/database/   modelos Sequelize y configuración
  views/            plantillas EJS (partials, admin, legal)
public/
  css/  js/  img/
database/
  schema.sql  datos-prueba.sql  instalar.js
```
