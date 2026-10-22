const favoritoService = require("../services/favoritoService");

const RECORDAR_MS = 30 * 24 * 60 * 60 * 1000;

function destinoSeguro(url) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

function iniciarSesion(req, res, usuario, { recordar = false, volver = "/", mensaje, extra = {} } = {}) {
  const { carrito, checkout, favoritos } = req.session;
  req.session.regenerate(async (err) => {
    if (err) {
      req.session.flash = "No pudimos iniciar sesión, probá de nuevo.";
      return res.redirect("/login");
    }
    Object.assign(req.session, { carrito, checkout, favoritos, usuarioLogueado: usuario, ...extra });
    try {
      await favoritoService.pasarACuenta(req.session, usuario.id);
    } catch (error) {
      console.error("No se pudieron pasar los favoritos a la cuenta:", error.message);
    }
    if (recordar) req.session.cookie.maxAge = RECORDAR_MS;
    req.session.flash = mensaje || `¡Hola, ${usuario.nombre}! Iniciaste sesión.`;
    req.session.save(() => res.redirect(destinoSeguro(volver)));
  });
}

module.exports = { destinoSeguro, iniciarSesion };
