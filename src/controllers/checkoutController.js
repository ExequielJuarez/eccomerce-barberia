const { validationResult } = require("express-validator");
const carrito = require("../services/carritoService");
const pedidos = require("../services/pedidoService");
const notificaciones = require("../services/notificacionService");
const whatsapp = require("../services/whatsappService");

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

    const quiereJson = req.accepts(["html", "json"]) === "json";
    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
      if (quiereJson) return res.status(422).json({ ok: false });
      return render(res, { resumen, datos, errores: resultado.mapped(), status: 422 });
    }

    let pedido;
    try {
      pedido = await pedidos.crearDesdeCarrito(resumen, datos);
    } catch (error) {
      if (!error.sinStock) throw error;
      req.session.flash = `${error.message}. Revisá tu carrito.`;
      return quiereJson ? res.json({ ok: false, url: "/carrito" }) : res.redirect("/carrito");
    }

    notificaciones.nuevoPedido(pedido).catch((e) => console.error("No se pudo notificar la compra:", e.message));

    carrito.vaciar(req.session);
    delete req.session.checkout;
    recordarPedido(req, pedido.numero);
    // La venta se cierra al mandar el carrito por WhatsApp: se va directo al chat del local.
    // (El formulario lo manda con fetch: el navegador no deja que un form termine en otro sitio por la política CSP.)
    const destino = whatsapp.linkLocal(pedido);
    if (destino) req.session.flash = "¡Gracias! Te estaremos contactando por WhatsApp en breve.";
    const url = destino || `/pedido/${pedido.numero}`;
    if (quiereJson) return res.json({ ok: true, url });
    res.redirect(url);
  },

  recordarPedido,
};
