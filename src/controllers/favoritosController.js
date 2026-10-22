const favoritos = require("../services/favoritoService");

module.exports = {
  async ver(req, res) {
    res.render("favoritos", {
      titulo: "Favoritos",
      estilo: "favoritos",
      productos: await favoritos.productos(req.session),
    });
  },

  async alternar(req, res) {
    const r = await favoritos.alternar(req.session, req.params.id);
    if (!r) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    res.json({ ok: true, ...r });
  },

  async vaciar(req, res) {
    await favoritos.vaciar(req.session);
    res.json({ ok: true, cantidad: 0 });
  }
};
