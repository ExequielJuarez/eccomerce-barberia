const { validationResult } = require("express-validator");
const pedidos = require("../services/pedidoService");
const usuarios = require("../services/usuarioService");
const provincias = require("../data/provincias");

const RECUPERO_MS = 30 * 60 * 1000;
const recuperando = (req) => Date.now() - (req.session.recuperoClaveEn || 0) < RECUPERO_MS;

const CAMPOS_PERFIL = ["nombre", "apellido", "email", "telefono", "dni", "calle", "numero", "piso", "codigoPostal", "ciudad", "provincia"];

async function renderDatos(req, res, { datos, errores = {}, erroresClave = {}, status = 200, abrir = null }) {
  const perfil = await usuarios.perfil(req.session.usuarioLogueado.id);
  res.status(status).render("mis-datos", {
    titulo: "Mis datos",
    estilo: ["cuenta", "mis-datos"],
    cuentaActiva: "datos",
    datos: datos || perfil,
    perfil,
    errores,
    erroresClave,
    provincias,
    abrir: abrir || (req.query.clave === "nueva" ? "clave" : null),
    recuperando: recuperando(req),
  });
}

module.exports = {
  async pedidos(req, res) {
    const lista = await pedidos.delUsuario(req.session.usuarioLogueado.id);
    res.render("mis-pedidos", {
      titulo: "Mis pedidos",
      estilo: ["cuenta", "mis-pedidos"],
      cuentaActiva: "pedidos",
      pedidos: lista,
      filtro: ["curso", "entregados", "cancelados"].includes(req.query.ver) ? req.query.ver : "todos",
    });
  },

  async verDatos(req, res) {
    await renderDatos(req, res, {});
  },

  async guardarDatos(req, res) {
    const datos = Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, String(req.body[c] ?? "").trim()]));
    datos.email = datos.email.toLowerCase();
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
      return renderDatos(req, res, { datos, errores: resultado.mapped(), status: 422 });
    }
    const usuario = await usuarios.actualizarPerfil(req.session.usuarioLogueado.id, datos);
    req.session.usuarioLogueado = usuario;
    req.session.flash = "Listo, guardamos tus datos.";
    res.redirect("/mi-cuenta/datos");
  },

  async cambiarClave(req, res) {
    const id = req.session.usuarioLogueado.id;
    const resultado = validationResult(req);
    const erroresClave = resultado.isEmpty() ? {} : resultado.mapped();

    if (!Object.keys(erroresClave).length) {
      const ok = await usuarios.cambiarClave(id, req.body.actual, req.body.nueva, { sinActual: recuperando(req) });
      if (!ok) erroresClave.actual = { msg: "La contraseña actual no es correcta" };
    }
    if (Object.keys(erroresClave).length) {
      return renderDatos(req, res, { erroresClave, status: 422, abrir: "clave" });
    }
    delete req.session.recuperoClaveEn;
    req.session.flash = "Listo, cambiaste tu contraseña.";
    res.redirect("/mi-cuenta/datos");
  },
};
