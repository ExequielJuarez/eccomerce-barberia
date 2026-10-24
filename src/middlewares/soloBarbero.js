const { esBarbero } = require("../helpers/roles");

module.exports = (req, res, next) => {
  const usuario = req.session.usuarioLogueado;
  if (!usuario) return res.redirect(`/login?volver=${encodeURIComponent(req.originalUrl)}`);
  if (!esBarbero(usuario)) {
    req.session.flash = "Esa sección es solo para el equipo de peluqueros.";
    return res.redirect("/");
  }
  next();
};
