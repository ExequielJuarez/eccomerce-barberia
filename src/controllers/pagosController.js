const pedidos = require("../services/pedidoService");
const whatsapp = require("../services/whatsappService");
const { esAdmin } = require("../helpers/roles");

function puedeVer(req, pedido) {
  const u = req.session.usuarioLogueado;
  if (!pedido) return false;
  if (u && (esAdmin(u) || (pedido.usuarioId && pedido.usuarioId === u.id))) return true;
  return (req.session.pedidosRecientes || []).includes(pedido.numero);
}

const sePuedeCancelar = (p) => p.estado === "pendiente" && p.pagoEstado !== "aprobado";

async function buscar(req, res) {
  const numero = Number(req.params.numero);
  const pedido = Number.isInteger(numero) ? await pedidos.obtener(numero) : null;
  if (!puedeVer(req, pedido)) {
    res.status(404).render("error-cuenta", {
      titulo: "Pedido no encontrado",
      estilo: "error-cuenta",
      mensaje: req.session.usuarioLogueado
        ? "No encontramos ese pedido en tu cuenta."
        : "Para ver tus pedidos iniciá sesión con la cuenta con la que compraste.",
    });
    return null;
  }
  return pedido;
}

module.exports = {
  async detalle(req, res) {
    const pedido = await buscar(req, res);
    if (!pedido) return;
    res.render("mi-pedido", {
      titulo: `Pedido #${pedido.numero}`,
      estilo: ["cuenta", "mi-pedido"],
      pedido,
      sePuedeCancelar: sePuedeCancelar(pedido),
      linkWhatsapp: whatsapp.linkCliente(pedido),
    });
  },

  async cancelar(req, res) {
    const pedido = await buscar(req, res);
    if (!pedido) return;
    if (!sePuedeCancelar(pedido)) {
      req.session.flash = "Este pedido ya no se puede cancelar desde acá. Escribinos y lo vemos.";
      return res.redirect(`/pedido/${pedido.numero}`);
    }
    await pedidos.cambiarEstado(pedido.numero, "cancelado");
    req.session.flash = `Cancelaste el pedido #${pedido.numero}.`;
    res.redirect(`/pedido/${pedido.numero}`);
  },
};
