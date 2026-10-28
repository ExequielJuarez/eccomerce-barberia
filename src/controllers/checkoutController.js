const { validationResult } = require("express-validator");
const carrito = require("../services/carritoService");
const pedidos = require("../services/pedidoService");
const notificaciones = require("../services/notificacionService");
const correo = require("../services/correoService");
const tienda = require("../helpers/tienda");
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

function avisarPorCorreo(pedido) {
  const lineas = pedido.items.map((i) => `- ${i.cantidad} x ${i.nombre}${i.color ? ` (${i.color})` : ""}`).join("\n");
  const cuando = pedido.entrega === "retiro" ? `el retiro en ${tienda().direccion}` : "el envío";
  const saludo = `Hola ${pedido.cliente.split(" ")[0]}! Recibimos tu pedido #${pedido.numero}:`;
  const aviso = `Nos estaremos poniendo en contacto con vos por WhatsApp (${pedido.telefono}) para coordinar el pago y ${cuando}.`;
  const texto = [saludo, "", lineas, "", aviso].join("\n");
  correo.enviarTexto({ email: pedido.email, asunto: `Recibimos tu pedido #${pedido.numero}`, texto }).catch(() => {});
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
    const final = await carrito.resumen(req.session);
    if (!final.items.length) return res.redirect("/carrito");

    const u = req.session.usuarioLogueado;
    let pedido;
    try {
      pedido = await pedidos.crearDesdeCarrito(final, datos, u);
    } catch (error) {
      if (!error.sinStock) throw error;
      req.session.flash = `${error.message}. Revisá tu carrito.`;
      return res.redirect("/carrito");
    }

    notificaciones.nuevoPedido(pedido).catch((e) => console.error("No se pudo notificar la compra:", e.message));
    avisarPorCorreo(pedido);
    if (u) await usuarios.guardarDireccionSiFalta(u.id, datos).catch((e) => console.error("No se guardó la dirección:", e.message));

    carrito.vaciar(req.session);
    delete req.session.checkout;
    recordarPedido(req, pedido.numero);
    req.session.flash = `¡Gracias! Recibimos tu pedido #${pedido.numero}. Nos estaremos poniendo en contacto con vos.`;
    res.redirect(`/pedido/${pedido.numero}`);
  },

  recordarPedido,
};
