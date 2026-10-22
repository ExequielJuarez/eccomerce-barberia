const { validationResult } = require("express-validator");
const carrito = require("../services/carritoService");
const pedidos = require("../services/pedidoService");
const notificaciones = require("../services/notificacionService");
const pagos = require("../services/pagoService");
const usuarios = require("../services/usuarioService");
const provincias = require("../data/provincias");

const CAMPOS = [
  "email", "nombre", "apellido", "telefono", "dni",
  "entrega", "calle", "numero", "piso", "codigoPostal", "ciudad", "provincia", "notas",
  "facturacion", "cuit", "razonSocial", "newsletter",
];

async function datosIniciales(req, resumen) {
  const guardados = req.session.checkout?.datos || {};

  const u = req.session.usuarioLogueado;
  const p = u ? await usuarios.perfil(u.id) : null;
  const deCuenta = p
    ? {
        email: p.email, nombre: p.nombre, apellido: p.apellido, telefono: p.telefono || "", dni: p.dni,
        calle: p.calle, numero: p.numero, piso: p.piso, ciudad: p.ciudad, provincia: p.provincia,
        ...(p.codigoPostal ? { codigoPostal: p.codigoPostal } : {}),
      }
    : {};
  return {
    entrega: resumen.entrega,
    facturacion: "consumidor",
    codigoPostal: resumen.codigoPostal || "",
    provincia: "",
    ...deCuenta,
    ...guardados,
  };
}

function recordarPedido(req, numero) {
  req.session.pedidosRecientes = [numero, ...(req.session.pedidosRecientes || [])].slice(0, 10);
}

function render(res, { req, resumen, datos, errores = {}, status = 200 }) {
  res.status(status).render("checkout-datos", {
    titulo: "Tus datos",
    estilo: "checkout-datos",
    resumen,
    datos,
    errores,
    provincias,
  });
}

module.exports = {
  async ver(req, res) {
    const resumen = await carrito.resumen(req.session);
    if (!resumen.items.length) return res.redirect("/carrito");
    render(res, { req, resumen, datos: await datosIniciales(req, resumen) });
  },

  async guardar(req, res) {
    const resumen = await carrito.resumen(req.session);
    if (!resumen.items.length) return res.redirect("/carrito");

    const datos = Object.fromEntries(CAMPOS.map((c) => [c, req.body[c] ?? ""]));
    datos.newsletter = Boolean(req.body.newsletter);

    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
      return render(res, { req, resumen, datos, errores: resultado.mapped(), status: 422 });
    }

    carrito.fijarEntrega(req.session, datos.entrega);
    if (datos.entrega === "domicilio") carrito.fijarCodigoPostal(req.session, datos.codigoPostal);

    req.session.checkout = { datos };

    const u = req.session.usuarioLogueado;
    if (u) await usuarios.guardarDireccionSiFalta(u.id, datos).catch((e) => console.error("No se guardó la dirección:", e.message));
    res.redirect("/checkout/pago");
  },

  async verPago(req, res) {
    const resumen = await carrito.resumen(req.session);
    const datos = req.session.checkout?.datos;
    if (!resumen.items.length) return res.redirect("/carrito");
    if (!datos) return res.redirect("/checkout/datos");

    if (pagos.modo() === "desactivado" && resumen.medioPago !== "transferencia") {
      carrito.fijarMedioPago(req.session, "transferencia");
      return res.redirect("/checkout/pago");
    }
    res.render("checkout-pago", {
      titulo: "Pago",
      estilo: ["checkout-datos", "checkout-pago"],
      resumen,
      datos,
      modoPago: pagos.modo(),
      pagoDePrueba: pagos.esTokenDePrueba(),
      venceHoras: pagos.venceHoras(),
    });
  },

  async confirmar(req, res) {
    if (["tarjeta", "transferencia"].includes(req.body.medio)) carrito.fijarMedioPago(req.session, req.body.medio);
    if (pagos.modo() === "desactivado") carrito.fijarMedioPago(req.session, "transferencia");
    const resumen = await carrito.resumen(req.session);
    const datos = req.session.checkout?.datos;
    if (!resumen.items.length) return res.redirect("/carrito");
    if (!datos) return res.redirect("/checkout/datos");

    let pedido;
    try {
      pedido = await pedidos.crearDesdeCarrito(resumen, datos, req.session.usuarioLogueado);
    } catch (error) {
      if (!error.sinStock) throw error;
      req.session.flash = `${error.message}. Revisá tu carrito.`;
      return res.redirect("/carrito");
    }

    notificaciones.nuevoPedido(pedido).catch((e) => console.error("No se pudo notificar la compra:", e.message));
    carrito.vaciar(req.session);
    delete req.session.checkout;
    recordarPedido(req, pedido.numero);

    if (pedido.medioPago === "transferencia") {
      req.session.flash = `¡Gracias! Tu pedido #${pedido.numero} quedó reservado. Te pasamos los datos para transferir.`;
      return res.redirect(`/pedido/${pedido.numero}`);
    }

    try {
      res.redirect(await pagos.iniciar(pedido));
    } catch (error) {
      console.error(`No se pudo iniciar el pago del pedido #${pedido.numero}:`, error.message);
      req.session.flash = "Tu pedido quedó guardado, pero no pudimos conectar con Mercado Pago. Probá pagar de nuevo en un momento.";
      res.redirect(`/pedido/${pedido.numero}`);
    }
  },

  recordarPedido,
};
