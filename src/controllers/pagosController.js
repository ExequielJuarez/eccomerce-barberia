const pedidos = require("../services/pedidoService");
const pagos = require("../services/pagoService");
const { esAdmin } = require("../helpers/roles");

function puedeVer(req, pedido) {
  const u = req.session.usuarioLogueado;
  if (!pedido) return false;
  if (u && (esAdmin(u) || (pedido.usuarioId && pedido.usuarioId === u.id))) return true;
  return (req.session.pedidosRecientes || []).includes(pedido.numero);
}

const sePuedePagar = (p) => p.medioPago === "tarjeta" && p.estado === "pendiente" && p.pagoEstado !== "aprobado";
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
    let pedido = await buscar(req, res);
    if (!pedido) return;

    if (sePuedePagar(pedido) && pagos.modo() !== "demo") {
      try {
        const r = await pagos.sincronizarPedido(pedido.numero);
        if (r) pedido = await pedidos.obtener(pedido.numero);
      } catch (error) {
        console.error(`No se pudo consultar el pago del pedido #${pedido.numero}:`, error.message);
      }
    }
    const motivo = req.session.motivoPago?.numero === pedido.numero ? req.session.motivoPago.texto : null;
    delete req.session.motivoPago;
    res.render("mi-pedido", {
      titulo: `Pedido #${pedido.numero}`,
      estilo: ["cuenta", "mi-pedido"],
      pedido,
      resultado: ["aprobado", "pendiente", "rechazado"].includes(req.query.pago) ? req.query.pago : null,
      motivo,
      sePuedePagar: sePuedePagar(pedido),
      sePuedeCancelar: sePuedeCancelar(pedido),
      transferencia: pagos.datosTransferencia(),
      venceHoras: pagos.venceHoras(),
      modoPago: pagos.modo(),
      conCuenta: Boolean(req.session.usuarioLogueado),
    });
  },

  async pagar(req, res) {
    const pedido = await buscar(req, res);
    if (!pedido) return;
    if (!sePuedePagar(pedido)) return res.redirect(`/pedido/${pedido.numero}`);
    try {
      res.redirect(await pagos.iniciar(pedido));
    } catch (error) {
      console.error(`No se pudo iniciar el pago del pedido #${pedido.numero}:`, error.message);
      req.session.flash = "No pudimos conectar con Mercado Pago. Probá de nuevo en un momento.";
      res.redirect(`/pedido/${pedido.numero}`);
    }
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

  async retorno(req, res) {
    const numero = Number(req.query.pedido || req.query.external_reference);
    if (!Number.isInteger(numero) || numero <= 0) return res.redirect("/");
    const pagoId = req.query.payment_id || req.query.collection_id;
    let estado = null;

    if (pagoId && pagoId !== "null") {
      try {
        const r = await pagos.sincronizar(pagoId, numero);
        if (r) {
          estado = r.pedido.pagoEstado;
          if (r.motivo) req.session.motivoPago = { numero, texto: r.motivo };
        }
      } catch (error) {
        console.error(`No se pudo consultar el pago ${pagoId}:`, error.message);
        estado = "pendiente";
      }
    }
    res.redirect(`/pedido/${numero}${estado ? `?pago=${estado}` : ""}`);
  },

  async webhook(req, res) {
    if (!pagos.firmaValida(req)) return res.sendStatus(401);
    const pagoId = pagos.pagoDeLaNotificacion(req);
    if (pagoId) {
      try {
        await pagos.sincronizar(pagoId);
      } catch (error) {
        console.error(`Webhook: no se pudo consultar el pago ${pagoId}:`, error.message);
        return res.sendStatus(500);
      }
    }
    res.sendStatus(200);
  },

  async verDemo(req, res) {
    if (pagos.modo() !== "demo") return res.redirect("/");
    const pedido = await buscar(req, res);
    if (!pedido) return;
    if (!sePuedePagar(pedido)) return res.redirect(`/pedido/${pedido.numero}`);
    res.render("pago-demo", { titulo: "Pagar (demo)", estilo: "pago-demo", pedido });
  },

  async confirmarDemo(req, res) {
    if (pagos.modo() !== "demo") return res.redirect("/");
    const pedido = await buscar(req, res);
    if (!pedido) return;
    if (!sePuedePagar(pedido)) return res.redirect(`/pedido/${pedido.numero}`);
    const r = await pagos.simular(pedido.numero, req.body.resultado);
    if (r?.motivo) req.session.motivoPago = { numero: pedido.numero, texto: r.motivo };
    res.redirect(`/pedido/${pedido.numero}?pago=${r ? r.pedido.pagoEstado : "pendiente"}`);
  },
};
