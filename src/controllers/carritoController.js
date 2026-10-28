const carrito = require("../services/carritoService");
const productoService = require("../services/productoService");

async function responder(req, res, extra = {}) {
  const r = await carrito.resumen(req.session);
  res.json({
    ok: true,
    cantidad: r.cantidad,
    resumen: {
      ...r,

      items: r.items.map((i) => ({ clave: i.clave, cantidad: i.cantidad, subtotal: i.subtotal })),
    },
    ...extra,
  });
}

module.exports = {
  async ver(req, res) {
    const resumen = await carrito.resumen(req.session);
    const enCarrito = new Set(resumen.items.map((i) => i.id));
    const catalogo = await productoService.listar();

    res.render("carrito", {
      titulo: "Tu carrito",
      estilo: "carrito",
      resumen,
      recomendados: catalogo.filter((p) => !enCarrito.has(p.id) && p.stock > 0).slice(0, 4),
    });
  },

  async agregar(req, res) {
    const { id, cantidad, color } = req.body;
    const resultado = await carrito.agregar(req.session, { id, cantidad, color });
    if (!resultado.ok) return res.status(400).json(resultado);
    await responder(req, res);
  },

  async actualizar(req, res) {
    if (!(await carrito.actualizar(req.session, req.params.clave, req.body.cantidad))) {
      return res.status(404).json({ ok: false, mensaje: "El producto ya no está en el carrito" });
    }
    await responder(req, res);
  },

  async quitar(req, res) {
    carrito.quitar(req.session, req.params.clave);
    await responder(req, res);
  },

  async vaciar(req, res) {
    carrito.vaciar(req.session);
    await responder(req, res);
  },

  async cupon(req, res) {
    if (!(await carrito.aplicarCupon(req.session, req.body.codigo))) {
      return res.status(400).json({ ok: false, mensaje: "El cupón no es válido o está vencido" });
    }
    await responder(req, res);
  },

  async quitarCupon(req, res) {
    carrito.quitarCupon(req.session);
    await responder(req, res);
  },

  async entrega(req, res) {
    carrito.fijarEntrega(req.session, req.body.entrega);
    await responder(req, res);
  },

  async envio(req, res) {
    if (!carrito.fijarCodigoPostal(req.session, req.body.codigoPostal)) {
      return res.status(400).json({ ok: false, mensaje: "Ingresá un código postal de 4 dígitos" });
    }
    await responder(req, res);
  },
};
