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

### Compartir la tienda con otras personas desde tu PC

`npm run compartir` arranca la tienda y, con un túnel gratuito de Cloudflare, genera un link `https://...trycloudflare.com` para pasar a otras
personas. Todo (base de datos y archivos) queda en tu PC. Guía completa en **[COMPARTIR.md](COMPARTIR.md)**.

## Usuarios de prueba

| Rol | Email | Clave |
| --- | --- | --- |
| Cliente | demo@tienda.com | Demo1234 |
| Admin | admin@tienda.com | Admin1234 |
| Superadmin | super@tienda.com | Super1234 |

Con `NODE_ENV=production` no se muestran en el login.

## Pedidos por WhatsApp

- El cliente arma el carrito, carga sus datos (**WhatsApp y email obligatorios**) y confirma. No se cobra en la web: ve el mensaje "nos estaremos poniendo en contacto" y recibe un email de confirmación.
- El pedido llega a `/admin/pedidos` con una notificación. Cada pedido tiene el botón **Enviar por WhatsApp**: abre WhatsApp (Web o app) al número del cliente con el mensaje ya armado (productos, total, datos y dirección de envío a confirmar). Solo falta apretar enviar.
- No hace falta ninguna API ni configuración: usa links `wa.me`. El número del cliente se normaliza al formato argentino (549 + área + número).
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
