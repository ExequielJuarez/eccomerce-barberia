const { validationResult } = require("express-validator");
const carrito = require("../services/carritoService");
const pedidos = require("../services/pedidoService");
const notificaciones = require("../services/notificacionService");

const CAMPOS = ["nombre", "apellido", "telefono", "entrega"];

function datosIniciales(req) {
  return { entrega: "retiro", ...(req.session.checkout?.datos || {}) };
}

function recordarPedido(req, numero) {
  req.session.pedidosRecientes = [numero, ...(req.session.pedidosRecientes || [])].slice(0, 10);
}

function render(res, { resumen, datos, errores = {}, status = 200 }) {
  res.status(status).render("checkout-datos", {
    titulo: "Tus datos",
    estilo: "checkout-datos",
    resumen,
    datos,
    errores,
  });
}

module.exports = {
  async ver(req, res) {
    const resumen = await carrito.resumen(req.session);
    if (!resumen.items.length) return res.redirect("/carrito");
    render(res, { resumen, datos: datosIniciales(req) });
  },

  async guardar(req, res) {
    const resumen = await carrito.resumen(req.session);
    if (!resumen.items.length) return res.redirect("/carrito");

    const datos = Object.fromEntries(CAMPOS.map((c) => [c, String(req.body[c] ?? "")]));

    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
      return render(res, { resumen, datos, errores: resultado.mapped(), status: 422 });
    }

    let pedido;
    try {
      pedido = await pedidos.crearDesdeCarrito(resumen, datos);
    } catch (error) {
      if (!error.sinStock) throw error;
      req.session.flash = `${error.message}. Revisá tu carrito.`;
      return res.redirect("/carrito");
    }

    notificaciones.nuevoPedido(pedido).catch((e) => console.error("No se pudo notificar la compra:", e.message));

    carrito.vaciar(req.session);
    delete req.session.checkout;
    recordarPedido(req, pedido.numero);
    res.redirect(`/pedido/${pedido.numero}?enviar=1`);
  },

  recordarPedido,
};
