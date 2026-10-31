const { esAdmin } = require("../helpers/roles");

module.exports = (req, res, next) => {
  if (esAdmin(req.session.usuarioLogueado)) return next();
  if (req.method !== "GET" || req.accepts(["html", "json"]) === "json") {
    return res.status(401).json({ ok: false, mensaje: "Tu sesión venció. Volvé a ingresar." });
  }
  res.redirect("/admin/login");
};
