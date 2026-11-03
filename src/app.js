require("dotenv").config();
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const crypto = require("crypto");
const seguridad = require("./middlewares/seguridad");
const tienda = require("./helpers/tienda");
const tiendaService = require("./services/tiendaService");
const etiquetaService = require("./services/etiquetaService");

const app = express();

const indexRouter = require("./routes/index.Routes");
const adminRouter = require("./routes/admin.Routes");
const db = require("./model/database/models");
const carritoService = require("./services/carritoService");
const favoritoService = require("./services/favoritoService");
const categoriaService = require("./services/categoriaService");

const puerto = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(seguridad.nonce);
app.use(seguridad.cabeceras);
app.use(express.static(path.join(__dirname, "../public"), { dotfiles: "ignore", index: false }));
app.use(seguridad.general);

app.get("/favicon.ico", (req, res) => res.redirect(301, "/img/marca/logo.png"));
app.use(express.urlencoded({ extended: false, limit: "100kb", parameterLimit: 500 }));
app.use(express.json({ limit: "100kb" }));
app.use(seguridad.mismoOrigen);
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let secretoSesion = process.env.SESSION_SECRET;
if (!secretoSesion && process.env.NODE_ENV === "production") {
  console.warn("⚠️  Falta SESSION_SECRET: se usa una clave al azar y las sesiones se pierden al reiniciar. Definí una clave larga y secreta.");
  secretoSesion = crypto.randomBytes(48).toString("hex");
}

app.use(
  session({
    name: "bb.sid",
    secret: secretoSesion || "clave-solo-para-desarrollo-local",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { secure: "auto", httpOnly: true, sameSite: "lax" },
  }),
);

app.locals.formatoPrecio = (n) =>
  "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


Object.assign(app.locals, require("./helpers/situacionPedido"));

Object.assign(app.locals, require("./helpers/roles"));

app.locals.textoRico = require("./services/inicioService").textoRico;

app.locals.formatoCompacto = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString("es-AR")} mil`;
  return `$${Math.round(n).toLocaleString("es-AR")}`;
};
app.locals.formatoPorcentaje = (n) => `${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
app.locals.formatoFecha = (fecha, conHora = false) =>
  new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.tienda = tienda();
  next();
});

app.use(async (req, res, next) => {
  res.locals.usuarioLocal = req.session.usuarioLogueado || null;
  res.locals.cantidadCarrito = carritoService.cantidadTotal(req.session);
  res.locals.favoritosIds = await favoritoService.ids(req.session);

  res.locals.categoriasMenu = await categoriaService.menu();
  res.locals.urlProductos = res.locals.categoriasMenu[0]?.url || "/";
  res.locals.categoriasNav = res.locals.categoriasMenu.slice(0, 6);

  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.use("/admin", adminRouter);
app.use("/", indexRouter);

app.use((req, res) => {
  if (req.accepts(["html", "json"]) === "json") return res.status(404).json({ ok: false, mensaje: "No encontrado" });
  res.status(404).render("error-cuenta", {
    titulo: "Página no encontrada",
    estilo: "error-cuenta",
    mensaje: "La página que buscás no existe o cambió de lugar.",
    general: true,
  });
});

app.use((err, req, res, next) => {
  console.error("❌", err);
  if (req.accepts(["html", "json"]) === "json") {
    return res.status(500).json({ ok: false, mensaje: "Error del servidor, probá de nuevo" });
  }
  res.status(500).render(
    "error-cuenta",
    { titulo: "Algo salió mal", estilo: "error-cuenta", mensaje: "Tuvimos un problema. Probá de nuevo en unos minutos.", general: true, codigo: 500 },

    (error, html) => res.send(error ? "<h1>Algo salió mal</h1><p>Probá de nuevo en unos minutos.</p>" : html)
  );
});

db.sequelize
  .authenticate()
  .then(async () => {
    await tiendaService.cargar();
    await etiquetaService.iniciar();
    console.log(`✅ Conectado a la base de datos "${db.sequelize.config.database}"`);
    app.listen(puerto, "0.0.0.0", () => {
      console.log(`🚀 Servidor Express corriendo en el puerto ${puerto}`);
      console.log(`   Local:   http://localhost:${puerto}`);
      Object.values(require("os").networkInterfaces())
        .flat()
        .filter((i) => i.family === "IPv4" && !i.internal)
        .forEach((i) => console.log(`   Celular: http://${i.address}:${puerto}  (misma red Wi-Fi)`));
    });


    console.log(
      {
        smtp: "✉️  Emails: enviando con SMTP",
        demo: "✉️  Emails en MODO DEMO: los códigos se muestran en pantalla. Configurá SMTP_* en .env (ver ACCESO.md).",
        desactivado: "⚠️  Faltan SMTP_*: no se pueden mandar códigos por email (ver ACCESO.md).",
      }[require("./services/correoService").modo()]
    );
  })
  .catch((error) => {
    console.error("❌ No se pudo conectar con la base de datos:", error.message);
    console.error("   Revisá DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el .env y que MySQL esté encendido.");
    console.error("   Para crear las tablas y cargar datos de prueba: npm run db:instalar");
    process.exit(1);
  });
