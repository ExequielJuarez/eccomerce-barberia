const tienda = require("../helpers/tienda");

const pesos = (n) => "$" + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
const digitos = (v) => String(v || "").replace(/\D/g, "");

// Arma el número para wa.me (formato internacional argentino: 549 + área + número, sin 0 ni 15).
function numeroCliente(telefono) {
  let d = digitos(telefono);
  if (!d) return "";
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) return "549" + d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === "15") {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  return "549" + d;
}

const detalleItems = (pedido) =>
  pedido.items.map((i) => `• ${i.cantidad} x ${i.nombre}${i.color ? ` (${i.color})` : ""} — ${pesos(i.precio * i.cantidad)}`);

const totales = (pedido) => [
  `Subtotal: ${pesos(pedido.subtotal)}`,
  ...(pedido.descuento > 0 ? [`Descuento${pedido.cuponCodigo ? ` (${pedido.cuponCodigo})` : ""}: -${pesos(pedido.descuento)}`] : []),
  `*Total: ${pesos(pedido.total)}*`,
];

const entregaTexto = (pedido) =>
  pedido.entrega === "retiro" ? `Retiro en el local (${tienda().direccion})` : "Envío a domicilio (lo coordinamos por WhatsApp)";

// Lo que manda el cliente al WhatsApp del local con su carrito.
function mensajeLocal(pedido) {
  return [
    `Hola ${tienda().nombre}! Quiero confirmar este pedido (*#${pedido.numero}*):`,
    "",
    ...detalleItems(pedido),
    "",
    ...totales(pedido),
    "",
    `Nombre: ${pedido.cliente}`,
    `WhatsApp: ${pedido.telefono}`,
    `Entrega: ${entregaTexto(pedido)}`,
  ].join("\n");
}

// Lo que el local le manda al cliente desde el panel para confirmar y coordinar.
function mensajeCliente(pedido) {
  return [
    `Hola ${pedido.cliente.split(" ")[0]}! Te escribimos de ${tienda().nombre} por tu pedido *#${pedido.numero}*.`,
    "",
    ...detalleItems(pedido),
    "",
    ...totales(pedido),
    `Entrega: ${entregaTexto(pedido)}`,
    "",
    pedido.entrega === "retiro"
      ? "¿Está todo bien? Confirmanos y coordinamos el pago y cuándo pasás a retirarlo. ¡Gracias!"
      : "¿Está todo bien? Pasanos tu dirección completa (calle, altura, ciudad, provincia y código postal) y coordinamos el pago y el envío. ¡Gracias!",
  ].join("\n");
}

// Abre el WhatsApp del local con el pedido ya escrito.
function linkLocal(pedido) {
  const base = tienda().whatsapp;
  return base ? `${base}?text=${encodeURIComponent(mensajeLocal(pedido))}` : "";
}

// Link del panel admin: abre WhatsApp al cliente con el mensaje ya armado.
function linkAdmin(pedido) {
  const numero = numeroCliente(pedido.telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensajeCliente(pedido))}` : "";
}

module.exports = { mensajeLocal, mensajeCliente, linkLocal, linkAdmin, numeroCliente };
