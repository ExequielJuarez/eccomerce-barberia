module.exports = (req, res, next) => {
  if (!req.session.usuarioLogueado) return res.redirect(`/login?volver=${encodeURIComponent(req.originalUrl)}`);
  next();
};
