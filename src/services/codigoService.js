const crypto = require("crypto");
const correo = require("./correoService");

const VENCE_MIN = 10;
const MAX_INTENTOS = 5;
const ESPERA_REENVIO_MS = 60 * 1000;
const MAX_ENVIOS = 5;
const VENTANA_ENVIOS_MS = 15 * 60 * 1000;

const hash = (codigo) => crypto.createHash("sha256").update(String(codigo)).digest("hex");

function enviosRecientes(session) {
  const ahora = Date.now();
  session.codigosEnviados = (session.codigosEnviados || []).filter((t) => ahora - t < VENTANA_ENVIOS_MS);
  return session.codigosEnviados;
}

async function enviar(session, { email, motivo, volver = "/", datos = null }) {
  const envios = enviosRecientes(session);
  if (envios.length >= MAX_ENVIOS) {
    return { ok: false, mensaje: "Pediste muchos códigos seguidos. Esperá unos minutos y probá de nuevo." };
  }
  const anterior = session.codigo;
  if (anterior && anterior.email === email && Date.now() - anterior.enviadoEn < ESPERA_REENVIO_MS) {
    const seg = Math.ceil((ESPERA_REENVIO_MS - (Date.now() - anterior.enviadoEn)) / 1000);
    return { ok: false, mensaje: `Esperá ${seg} segundos para pedir otro código.` };
  }

  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const envio = await correo.enviarCodigo({ email, codigo, motivo, minutos: VENCE_MIN });
  if (!envio.ok) {
    return { ok: false, mensaje: "No pudimos mandar el email. Probá de nuevo en un rato." };
  }

  envios.push(Date.now());
  session.codigo = {
    email,
    motivo,
    volver,
    datos,
    hash: hash(codigo),
    vence: Date.now() + VENCE_MIN * 60 * 1000,
    enviadoEn: Date.now(),
    intentos: 0,

    demo: envio.demo ? codigo : null,
  };
  return { ok: true };
}

async function reenviar(session) {
  const actual = session.codigo;
  if (!actual) return { ok: false, mensaje: "Volvé a pedir el código." };
  return enviar(session, { email: actual.email, motivo: actual.motivo, volver: actual.volver, datos: actual.datos });
}

function verificar(session, codigo) {
  const actual = session.codigo;
  if (!actual) return { ok: false, agotado: true, mensaje: "El código venció. Pedí uno nuevo." };
  if (Date.now() > actual.vence) {
    delete session.codigo;
    return { ok: false, agotado: true, mensaje: "El código venció. Pedí uno nuevo." };
  }
  const limpio = String(codigo || "").replace(/\D/g, "");
  const esperado = Buffer.from(actual.hash, "hex");
  const recibido = Buffer.from(hash(limpio), "hex");
  if (limpio.length === 6 && crypto.timingSafeEqual(esperado, recibido)) {
    delete session.codigo;
    return { ok: true, pendiente: actual };
  }
  actual.intentos += 1;
  if (actual.intentos >= MAX_INTENTOS) {
    delete session.codigo;
    return { ok: false, agotado: true, mensaje: "Te equivocaste muchas veces. Pedí un código nuevo." };
  }
  const quedan = MAX_INTENTOS - actual.intentos;
  return { ok: false, mensaje: `El código no es correcto. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.` };
}

function ocultarEmail(email) {
  const [usuario, dominio] = String(email).split("@");
  return `${usuario.slice(0, 2)}${"•".repeat(Math.max(3, usuario.length - 2))}@${dominio}`;
}

module.exports = { VENCE_MIN, ESPERA_REENVIO_MS, enviar, reenviar, verificar, ocultarEmail, disponible: () => correo.modo() !== "desactivado" };
