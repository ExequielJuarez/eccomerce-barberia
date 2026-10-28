# Compartir la tienda desde tu PC (para que otras personas la prueben)

La tienda corre **en tu PC** y un túnel gratuito de Cloudflare le da un link `https://algo.trycloudflare.com` que podés pasar a quien quieras.
No hace falta abrir puertos del router, tener IP fija ni pagar nada.

## Qué necesitás (una sola vez)
1. **Node.js (LTS)**: https://nodejs.org
2. **MySQL encendido**: lo más simple es **XAMPP** (https://www.apachefriends.org) → botón *Start* en MySQL.
3. **cloudflared** (el túnel, ~40 MB). En una terminal:
   ```
   winget install --id Cloudflare.cloudflared
   ```
   Cerrá y abrí la terminal. Si no tenés `winget`, bajá `cloudflared-windows-amd64.exe` de
   https://github.com/cloudflare/cloudflared/releases y guardalo como `herramientas\cloudflared.exe` dentro del proyecto.
4. **El archivo `.env`** (en esta rama ya no se sube a git): copiá `.env.example` a `.env`. Con XAMPP no hay que cambiar nada
   (usuario `root`, sin contraseña, base `barba_black`). Si tu MySQL tiene contraseña, completá `DB_PASSWORD=`.

## Cómo se usa
En una terminal dentro de la carpeta del proyecto (rama `claude/compartir-local`):

```
npm install            # solo la primera vez
npm run compartir
```

Si la base no existe, **la crea sola** (con productos de ejemplo; con `npm run compartir -- --vacia` sin productos). Al terminar muestra:

```
 LINK PARA COMPARTIR (válido mientras esta ventana siga abierta)
    https://mi-tienda-123.trycloudflare.com
 Cuentas de la tienda:
    CLIENTE (para pasar a quienes prueban):  demo@tienda.com   clave: Xk3d9...
    ADMIN   (solo para vos):                 admin@tienda.com  clave: Qp7s2...
    SUPERADMIN (solo para vos):              super@tienda.com  clave: Ab12c...
```

Pasale a la gente **el link** y la cuenta de **cliente** (o que se registren ellos mismos desde "Registrarse"). El panel de administración
(`/admin`) es solo para vos.

- **Las claves del README (Demo1234, Admin1234, Super1234) ya no funcionan** en este modo: como la tienda queda en internet, el script las
  reemplaza por claves al azar (también si tu base ya existía con las claves de ejemplo). Si no recordás las nuevas:
  `npm run compartir -- --nuevas-claves`.
- En este modo el login **no muestra** los "usuarios de prueba".
- Para **cortar el acceso**: `Ctrl + C` en la terminal. El link deja de funcionar al instante.

## Cosas a tener en cuenta
- **Registro y códigos por email:** si tenés `SMTP_*` configurado en `.env`, los códigos se mandan por email. Si no, la tienda está en "modo demo" y el
  código aparece **en la pantalla** al registrarse, así que se puede probar sin correo.
- **Login con Google:** queda desactivado mientras compartís, porque Google exige una URL fija y este link cambia cada vez. Se entra con email y contraseña.
- **Pedidos:** se coordinan por WhatsApp como siempre; llegan a `/admin/pedidos`.
- **Dónde se guarda todo:** en **tu PC**. La base de datos en el MySQL local, y las fotos de productos y contenido que subas en `public/img/...`.
  El túnel solo pasa el tráfico, no guarda nada en una nube. (Si en `.env` dejaste una base remota, como la de Clever Cloud, el script lo avisa:
  en ese caso los datos van a esa base y no a tu PC.)
- **Tu PC** tiene que estar **encendida, con internet y sin suspenderse**, y la ventana abierta. **El link cambia** cada vez que lo reiniciás.
- Es un servicio gratuito sin garantías: sirve para probar con pocas personas, no para producción. Depende de tu velocidad de **subida**.
- Mientras esté prendido, cualquiera con el link ve la tienda. No lo difundas y no pases las claves de admin.

## Importante: credenciales viejas en git
El archivo `.env` anterior tenía las credenciales de la base de Clever Cloud y estaba subido al repositorio. En esta rama se dejó de versionar,
pero **queda en el historial**: cambiá esa contraseña en Clever Cloud.

## Problemas frecuentes
- **Falta cloudflared** → instalalo (paso 3) y volvé a ejecutar `npm run compartir`.
- **No conecta a MySQL** → encendelo en XAMPP y revisá `.env`.
- **"No se pudo crear el link público"** → revisá tu conexión a internet o un antivirus/firewall que bloquee `cloudflared`.
