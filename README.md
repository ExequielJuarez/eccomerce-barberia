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

## Panel de administración

- El público no tiene cuentas ni inicio de sesión: se compra como invitado. Solo el personal entra al panel, con usuario y contraseña, en `/admin/login` (no hay ningún enlace público hacia esa página).
- Crear un admin o cambiar una clave (la pide por consola, sin mostrarla): `npm run admin -- usuario@mail.com "Nombre Apellido"` (agregá `--super` para superadmin).
- `npm run db:instalar` carga dos usuarios de **prueba** (`admin@tienda.com` y `super@tienda.com`, claves `Admin1234` / `Super1234`). Con `NODE_ENV=production` esas claves quedan bloqueadas: cambialas antes de publicar con el comando de arriba.

## Seguridad

- Contraseñas con bcrypt (costo 12); el login compara siempre contra un hash para no revelar si el usuario existe.
- Límite de intentos: 10 por IP cada 15 min y bloqueo de 15 min por usuario tras 5 fallos. Límites también en compra, arrepentimiento y un tope general por IP.
- Sesión nueva en cada ingreso, cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` con HTTPS), vence a las 8 h de inactividad.
- Cabeceras con Helmet y política CSP estricta (solo scripts propios o con nonce), sin iframes, HSTS en producción.
- Anti-CSRF: los pedidos que modifican datos solo se aceptan desde el mismo sitio (Origin/Sec-Fetch-Site).
- Base de datos: todas las consultas son parametrizadas (Sequelize); el buscador escapa los comodines.
- Imágenes subidas: tipo, tamaño y firma real del archivo (JPG/PNG/WEBP), con nombre aleatorio.
- En producción definí `SESSION_SECRET` (clave larga y al azar) y `NODE_ENV=production`, y servilo siempre con HTTPS.

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
