const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const produccion = process.env.NODE_ENV === "production";

// Cada respuesta lleva un nonce: solo los <script> propios con ese nonce pueden ejecutarse.
const nonce = (req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
};

const cabeceras = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://wa.me", "https://api.whatsapp.com"],
      frameAncestors: ["'none'"],
      ...(produccion ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  strictTransportSecurity: produccion ? { maxAge: 15552000, includeSubDomains: true } : false,
});

// Anti-CSRF: los pedidos que modifican datos solo se aceptan si vienen de este mismo sitio.
const hostDe = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

function rechazar(req, res) {
  res.status(403).json({ ok: false, mensaje: "Pedido rechazado por seguridad. Recargá la página e intentá de nuevo." });
}

const mismoOrigen = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("sec-fetch-site") === "cross-site") return rechazar(req, res);
  const origen = req.get("origin") || req.get("referer");
  if (origen) {
    const propios = [req.get("host"), req.get("x-forwarded-host")].filter(Boolean);
    if (!propios.includes(hostDe(origen))) return rechazar(req, res);
  }
  next();
};

const limite = ({ ventanaMin, max, mensaje, saltarExitos = false }) =>
  rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: saltarExitos,
    handler: (req, res) => {
      if (req.accepts(["html", "json"]) === "json") return res.status(429).json({ ok: false, mensaje });
      res.status(429).render("error-cuenta", { titulo: "Demasiados intentos", estilo: "error-cuenta", mensaje, general: true, codigo: 429 });
    },
  });

module.exports = {
  nonce,
  cabeceras,
  mismoOrigen,
  general: limite({ ventanaMin: 1, max: 300, mensaje: "Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo." }),
  login: limite({ ventanaMin: 15, max: 10, saltarExitos: true, mensaje: "Demasiados intentos de ingreso. Probá de nuevo en 15 minutos." }),
  pedido: limite({ ventanaMin: 15, max: 20, mensaje: "Hiciste muchos intentos de compra seguidos. Probá de nuevo en unos minutos." }),
  formulario: limite({ ventanaMin: 60, max: 10, mensaje: "Enviaste muchas solicitudes. Probá de nuevo más tarde." }),
};
