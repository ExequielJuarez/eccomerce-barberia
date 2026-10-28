# Barba Black · Tienda

Tienda online de insumos de peluquería y barbería. Los pedidos se coordinan por WhatsApp. Hecha con Node.js, Express, EJS, Sequelize y MySQL, sobre la estructura de `carpeta-base`.

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run db:instalar
npm run dev
```

Completá en `.env` los datos de conexión a MySQL (`DB_*`) y, si querés, los del negocio (`TIENDA_*`). Con `npm run db:vacia` se crea la estructura sin productos de ejemplo.

### Probar desde el celular

Al iniciar, la consola muestra una línea `Celular: http://<ip>:3000`. Con el celular en el mismo Wi-Fi que la PC, abrí esa dirección en el navegador. Si no carga, permití Node.js (puerto 3000) en el Firewall de Windows para redes privadas.

## Usuarios de prueba

| Rol | Email | Clave |
| --- | --- | --- |
| Cliente | demo@tienda.com | Demo1234 |
| Admin | admin@tienda.com | Admin1234 |
| Superadmin | super@tienda.com | Super1234 |

Con `NODE_ENV=production` no se muestran en el login.

## Pedidos por WhatsApp

- El cliente arma el carrito, carga sus datos (**WhatsApp y email obligatorios**) y confirma. No se cobra en la web: ve el mensaje "nos estaremos poniendo en contacto" y recibe un email de confirmación.
- El sistema manda el pedido completo al WhatsApp del local (`WHATSAPP_PEDIDOS_NUMERO`, con código de país, ej. `5493854000000`) y lo registra en `/admin/pedidos` con una notificación.
- Si el envío por WhatsApp falla o no está configurado, el pedido igual queda guardado y visible en el panel.
- Opciones de envío (`WHATSAPP_PROVIDER`):
  - `callmebot`: gratis, para un número propio. Se activa desde el WhatsApp del local siguiendo las instrucciones de callmebot.com, que te dan una apikey para `CALLMEBOT_APIKEY`.
  - `cloud`: API oficial de Meta (WhatsApp Business Platform). Necesita `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_CLOUD_PHONE_ID` y, para escribir primero al local, una plantilla aprobada (`WHATSAPP_CLOUD_TEMPLATE`, con un solo parámetro en el cuerpo).
- Bases ya instaladas: correr `database/migracion-whatsapp.sql` una sola vez.

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

## Local

- Venta de insumos y retiro de pedidos: La Plata 212.
