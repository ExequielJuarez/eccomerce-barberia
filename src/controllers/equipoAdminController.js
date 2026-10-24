const equipo = require("../services/equipoService");
const turnos = require("../services/turnoService");
const productoService = require("../services/productoService");
const pedidoService = require("../services/pedidoService");

const volver = (req, res, mensaje, destino = "/admin/equipo") => {
  if (mensaje) req.session.flash = mensaje;
  res.redirect(destino);
};

module.exports = {
  async ver(req, res) {
    const [lista, sucursales, totalProductos, pedidosPendientes, turnosPendientes] = await Promise.all([
      equipo.listar(),
      turnos.sucursales({ soloActivas: false }),
      productoService.total(),
      pedidoService.pendientes(),
      turnos.pendientesHoy(),
    ]);
    res.render("admin/equipo", {
      titulo: "Equipo",
      estilo: ["admin", "admin-turnos", "admin-equipo"],
      usuario: req.session.usuarioLogueado,
      seccion: "equipo",
      totalProductos,
      pedidosPendientes,
      turnosPendientes,
      lista,
      sucursales,
    });
  },

  async crear(req, res) {
    const r = req.errorFoto ? { ok: false, mensaje: req.errorFoto } : await equipo.crear(req.body, req.file);
    if (req.errorFoto && req.file) require("fs").unlink(req.file.path, () => {});
    volver(req, res, r.ok ? "Peluquero creado. Ya puede iniciar sesión con su email y contraseña." : r.mensaje);
  },

  async actualizar(req, res) {
    const r = req.errorFoto ? { ok: false, mensaje: req.errorFoto } : await equipo.actualizar(req.params.id, req.body, req.file);
    volver(req, res, r.ok ? "Cambios guardados." : r.mensaje);
  },

  async eliminar(req, res) {
    const r = await equipo.eliminar(req.params.id);
    volver(req, res, r.ok ? `${r.nombre} fue eliminado del equipo y ya no puede iniciar sesión.` : r.mensaje);
  },
};
