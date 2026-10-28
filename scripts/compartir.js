// Publica la tienda desde TU PC con un link https que se puede pasar a otras personas (túnel de Cloudflare, gratis y sin cuenta).
//   npm run compartir                     → prepara todo, arranca la tienda y el túnel, y muestra el link
//   npm run compartir -- --nuevas-claves  → además genera contraseñas nuevas para las cuentas de prueba
//   npm run compartir -- --vacia          → si la base no existe, la crea SIN productos de ejemplo
//
// Todo se ejecuta en tu PC: la tienda, los archivos subidos (fotos de productos) y la base de datos local quedan en tu PC.
// El túnel solo "pasa" el tráfico. Si tu PC se apaga o cerrás esta ventana, el link deja de funcionar y cambia cada vez.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const ES_WIN = process.platform === "win32";

// Cuentas de ejemplo de database/datos-prueba.sql: sus claves están publicadas en el README, no pueden quedar en internet
const CUENTAS = [
  { email: "demo@tienda.com", nombre: "Cliente", apellido: "Demo", rol: "cliente", claveEjemplo: "Demo1234" },
  { email: "admin@tienda.com", nombre: "Admin", apellido: "Barba Black", rol: "admin", claveEjemplo: "Admin1234" },
  { email: "super@tienda.com", nombre: "Super", apellido: "Admin", rol: "superadmin", claveEjemplo: "Super1234" },
];

// Link que muestra cloudflared en su salida, por ejemplo https://palabra-otra-palabra.trycloudflare.com
const extraerUrl = (texto) => {
  const m = String(texto).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  return m ? m[0] : null;
};

// Contraseña aleatoria de 12 caracteres (letras, números, "-" y "_")
const generarClave = () => crypto.randomBytes(9).toString("base64url");

const esLocal = (host) => ["127.0.0.1", "localhost", "::1", ""].includes(String(host || "").toLowerCase());

// Busca cloudflared: variable CLOUDFLARED_PATH, carpeta herramientas/ del proyecto, o el PATH del sistema
const buscarCloudflared = () => {
  const candidatos = [process.env.CLOUDFLARED_PATH, path.join(RAIZ, "herramientas", ES_WIN ? "cloudflared.exe" : "cloudflared")].filter(Boolean);
  for (const c of candidatos) if (fs.existsSync(c)) return c;
  const r = spawnSync(ES_WIN ? "where" : "which", ["cloudflared"], { encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.split(/\r?\n/)[0].trim();
  return null;
};

const linea = (t = "") => console.log(t);
const caja = (titulo) => {
  linea();
  linea("  " + "=".repeat(64));
  linea("   " + titulo);
  linea("  " + "=".repeat(64));
};
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Prepara la base: la crea si no existe (con productos de ejemplo salvo --vacia) y deja cuentas con claves que NO son las del README.
// Devuelve las cuentas cuyas claves se generaron ahora.
async function prepararBase({ nuevasClaves, vacia }) {
  const mysql = require("mysql2/promise");
  const bcrypt = require("bcryptjs");
  const DB = process.env.DB_NAME || "barba_black";
  const conexionBase = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || undefined,
  };

  let admin;
  try {
    admin = await mysql.createConnection(conexionBase);
  } catch (e) {
    console.error("\n  [ERROR] No se pudo conectar a MySQL: " + e.message);
    console.error("  Verificá que MySQL esté encendido (XAMPP > Start) y los datos DB_* del archivo .env.\n");
    process.exit(1);
  }
  const [dbs] = await admin.query("SHOW DATABASES LIKE ?", [DB]);
  let hayTablas = false;
  if (dbs.length) {
    const [t] = await admin.query("SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'usuarios'", [DB]);
    hayTablas = t[0].n > 0;
  }
  await admin.end();

  // schema.sql BORRA las tablas: solo se instala si la base todavía no tiene la tienda
  if (!hayTablas) {
    linea(`  La base "${DB}" no existe o está vacía: se instala la tienda${vacia ? " (sin productos de ejemplo)" : " con productos de ejemplo"}...`);
    const r = spawnSync(process.execPath, [path.join(RAIZ, "database", "instalar.js"), ...(vacia ? ["--vacia"] : [])], { cwd: RAIZ, env: process.env, stdio: "inherit" });
    if (r.status !== 0) {
      console.error("\n  [ERROR] No se pudo instalar la base de datos (mirá el mensaje de arriba).\n");
      process.exit(1);
    }
  }

  const conexion = await mysql.createConnection({ ...conexionBase, database: DB });
  const nuevas = [];
  try {
    for (const c of CUENTAS) {
      const [filas] = await conexion.query("SELECT id, password FROM usuarios WHERE email = ?", [c.email]);
      const existe = filas.length > 0;
      // ¿todavía tiene la clave de ejemplo publicada? entonces se cambia sí o sí
      const conClaveDeEjemplo = existe && filas[0].password && bcrypt.compareSync(c.claveEjemplo, filas[0].password);
      if (existe && !nuevasClaves && !conClaveDeEjemplo) continue;
      const clave = generarClave();
      const hash = bcrypt.hashSync(clave, 10);
      if (existe) await conexion.query("UPDATE usuarios SET password = ? WHERE id = ?", [hash, filas[0].id]);
      else await conexion.query("INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)", [c.nombre, c.apellido, c.email, hash, c.rol]);
      nuevas.push({ ...c, clave });
    }
  } finally {
    await conexion.end();
  }
  return { nuevas, hayTablasAntes: hayTablas };
}

// Arranca cloudflared y devuelve { hijo, url } (url null si no apareció en 60 segundos)
function abrirTunel(cloudflared, puerto) {
  return new Promise((resolver) => {
    const hijo = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${puerto}`], { stdio: ["ignore", "pipe", "pipe"] });
    let listo = false;
    const alSalida = (dato) => {
      if (listo) return;
      const url = extraerUrl(dato.toString());
      if (url) {
        listo = true;
        resolver({ hijo, url });
      }
    };
    hijo.stdout.on("data", alSalida);
    hijo.stderr.on("data", alSalida);
    hijo.on("error", () => !listo && ((listo = true), resolver({ hijo: null, url: null })));
    hijo.on("exit", (codigo) => {
      if (!listo) {
        listo = true;
        resolver({ hijo: null, url: null });
      } else {
        console.log(`\n  El túnel se cerró (código ${codigo}). El link dejó de funcionar. Volvé a ejecutar: npm run compartir`);
        process.exit(codigo || 0);
      }
    });
    setTimeout(() => !listo && ((listo = true), resolver({ hijo, url: null })), 60000);
  });
}

async function esperarTienda(puerto) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/login`, { redirect: "manual" });
      if (r.status < 500) return true;
    } catch (e) {
      /* todavía no responde */
    }
    await esperar(1000);
  }
  return false;
}

async function principal() {
  require("dotenv").config({ quiet: true });
  const args = process.argv.slice(2);
  const nuevasClaves = args.includes("--nuevas-claves");
  const vacia = args.includes("--vacia");

  const PUERTO = Number(process.env.PORT) || 3000;
  process.env.PORT = String(PUERTO);
  process.env.MODO_COMPARTIR = "true"; // oculta los "usuarios de prueba" del login (ver usuarioController)
  // El login real de Google necesita una URL fija registrada en Google: con un link que cambia no puede funcionar
  const habiaGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  // Clave de sesiones propia de esta PC (se crea una vez y se guarda; no se sube a git)
  if (!process.env.SESSION_SECRET) {
    const archivo = path.join(RAIZ, ".sesion-secreto");
    if (!fs.existsSync(archivo)) fs.writeFileSync(archivo, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    process.env.SESSION_SECRET = fs.readFileSync(archivo, "utf8").trim();
  }

  caja("PREPARANDO LA TIENDA");
  const host = process.env.DB_HOST || "127.0.0.1";
  if (!esLocal(host)) {
    linea();
    linea(`  AVISO: la base de datos está en "${host}" (no en esta PC). Lo que carguen NO se guarda en tu computadora.`);
    linea("         Para usar MySQL local, revisá DB_HOST/DB_USER/DB_PASSWORD/DB_NAME en el archivo .env.");
  }
  const { nuevas } = await prepararBase({ nuevasClaves, vacia });

  // Túnel primero: así la tienda arranca ya sabiendo su link público (APP_URL)
  const cloudflared = buscarCloudflared();
  let url = null;
  let hijo = null;
  if (cloudflared) {
    linea();
    linea("  Creando el link público...");
    ({ hijo, url } = await abrirTunel(cloudflared, PUERTO));
    if (url) {
      process.env.APP_URL = url;
      process.env.GOOGLE_CALLBACK_URL = `${url}/auth/google/callback`;
    }
  }

  require("../src/app"); // arranca la tienda (es la misma de siempre)
  const arriba = await esperarTienda(PUERTO);
  if (!arriba) {
    console.error("\n  [ERROR] La tienda no respondió. Mirá los mensajes de arriba.\n");
    process.exit(1);
  }

  const mostrarCuentas = () => {
    linea("  Cuentas de la tienda:");
    const porRol = (rol) => nuevas.find((c) => c.rol === rol);
    const cli = porRol("cliente");
    const adm = porRol("admin");
    const sup = porRol("superadmin");
    linea(cli ? `    CLIENTE (para pasar a quienes prueban):  ${cli.email}   clave: ${cli.clave}` : "    cliente  -> ya existía: usá su clave actual (o  npm run compartir -- --nuevas-claves)");
    linea(adm ? `    ADMIN   (solo para vos):                 ${adm.email}  clave: ${adm.clave}` : "    admin    -> ya existía: usá su clave actual");
    linea(sup ? `    SUPERADMIN (solo para vos):              ${sup.email}   clave: ${sup.clave}` : "    superadmin -> ya existía: usá su clave actual");
    linea("  Las claves de ejemplo del README (Demo1234, Admin1234...) ya NO funcionan.");
    linea("  Cualquiera puede además crear su propia cuenta con 'Registrarse' (en modo demo el código aparece en pantalla).");
    linea();
  };

  caja("TIENDA FUNCIONANDO EN ESTA PC:  http://localhost:" + PUERTO);
  linea();
  if (habiaGoogle) linea("  Nota: el login con Google real está desactivado en este modo (necesita un link fijo). Se entra con email y contraseña.");

  if (!cloudflared || !url) {
    linea();
    if (!cloudflared) {
      linea("  Para generar el link público falta instalar cloudflared (gratis, ~40 MB):");
      linea("    Windows:  winget install --id Cloudflare.cloudflared   (y abrir una terminal nueva)");
      linea("    o bajar cloudflared-windows-amd64.exe de https://github.com/cloudflare/cloudflared/releases");
      linea("    y guardarlo como  herramientas\\cloudflared.exe  dentro del proyecto.");
      linea("  Después volvé a ejecutar:  npm run compartir");
    } else {
      linea("  No se pudo crear el link público (revisá tu conexión a internet) y volvé a ejecutar:  npm run compartir");
    }
    linea("  (Mientras tanto la tienda sigue funcionando solo en esta PC.)");
    linea();
    mostrarCuentas();
  } else {
    caja("LINK PARA COMPARTIR (válido mientras esta ventana siga abierta)");
    linea();
    linea("    " + url);
    linea();
    mostrarCuentas();
    linea("  IMPORTANTE: tu PC debe quedar encendida, con internet y sin suspenderse. Para cortar el acceso: Ctrl + C.");
    linea("  Lo que se cargue (productos, fotos, pedidos) se guarda en ESTA PC. El link cambia cada vez que lo reiniciás.");
    linea();
  }

  const cerrar = () => {
    try {
      if (hijo) hijo.kill();
    } catch (e) {
      /* ya cerrado */
    }
    process.exit(0);
  };
  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);
}

if (require.main === module) {
  principal().catch((e) => {
    console.error("\n  [ERROR] " + e.message + "\n");
    process.exit(1);
  });
}

module.exports = { extraerUrl, generarClave, buscarCloudflared, esLocal, CUENTAS };
