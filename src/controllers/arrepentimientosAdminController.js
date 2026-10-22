const arrepentimientos = require("../services/arrepentimientoService");
const productoService = require("../services/productoService");
const pedidoService = require("../services/pedidoService");

module.exports = {
  async ver(req, res) {
    const [lista, totalProductos, pedidosPendientes] = await Promise.all([
      arrepentimientos.listar(),
      productoService.total(),
      pedidoService.pendientes(),
    ]);
    res.render("admin/arrepentimientos", {
      titulo: "Arrepentimientos",
      estilo: ["admin", "admin-arrepentimientos"],
      seccion: "arrepentimientos",
      usuario: req.session.usuarioLogueado,
      totalProductos,
      pedidosPendientes,
      lista,
    });
  },

  async cambiarEstado(req, res) {
    const a = await arrepentimientos.cambiarEstado(req.params.id, req.body.estado);
    req.session.flash = a
      ? `Solicitud ${a.codigo}: ${a.estado === "resuelta" ? "marcada como resuelta" : "vuelve a pendiente"}.`
      : "No se pudo actualizar la solicitud.";
    res.redirect("/admin/arrepentimientos");
  },
};
