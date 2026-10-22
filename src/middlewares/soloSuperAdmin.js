const { esSuperAdmin } = require("../helpers/roles");

module.exports = (req, res, next) => {
  if (esSuperAdmin(req.session.usuarioLogueado)) return next();
  if (req.method !== "GET" || req.accepts(["html", "json"]) === "json") {
    return res.status(403).json({ ok: false, mensaje: "Solo el superadministrador puede hacer esto" });
  }
  req.session.flash = "Esa sección es solo para el superadministrador.";
  res.redirect("/admin");
};
