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

// Mensaje que el local le manda al cliente con el pedido y los datos de entrega a confirmar.
function mensajeCliente(pedido) {
  const dom = pedido.entrega === "domicilio";
  const lineas = [
    `Hola ${pedido.cliente.split(" ")[0]}! Te escribimos de ${tienda().nombre || "Barba Black"} por tu pedido *#${pedido.numero}*.`,
    "",
    "*Tu pedido:*",
    ...pedido.items.map((i) => `• ${i.cantidad} x ${i.nombre}${i.color ? ` (${i.color})` : ""} — ${pesos(i.precio * i.cantidad)}`),
    "",
    `Subtotal: ${pesos(pedido.subtotal)}`,
    ...(pedido.descuento > 0 ? [`Descuento${pedido.cuponCodigo ? ` (${pedido.cuponCodigo})` : ""}: -${pesos(pedido.descuento)}`] : []),
    `Envío: ${pedido.envio > 0 ? pesos(pedido.envio) : "Gratis"}`,
    `*Total: ${pesos(pedido.total)}*`,
    "",
    "*Datos a confirmar:*",
    `Nombre: ${pedido.cliente}`,
    `DNI: ${pedido.dni}`,
    `Email: ${pedido.email}`,
    dom
      ? `Envío a: ${pedido.calle} ${pedido.altura}${pedido.piso ? `, ${pedido.piso}` : ""}, ${pedido.ciudad}, ${pedido.provincia} (CP ${pedido.codigoPostal})`
      : `Retiro en el local: ${tienda().direccion}`,
  ];
  if (pedido.facturacion === "facturaA") lineas.push(`Factura A: ${pedido.razonSocial} (CUIT ${pedido.cuit})`);
  if (pedido.notas) lineas.push(`Nota: ${pedido.notas}`);
  lineas.push("", "¿Está todo bien? Confirmanos y te pasamos los datos para el pago. ¡Gracias!");
  return lineas.join("\n");
}

// Link del panel admin: abre WhatsApp al cliente con el mensaje ya armado.
function linkAdmin(pedido) {
  const numero = numeroCliente(pedido.telefono);
  if (!numero) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensajeCliente(pedido))}`;
}

// Link para que el cliente le escriba al local (se muestra en su pantalla del pedido).
function linkCliente(pedido) {
  const numero = digitos(tienda().whatsapp);
  if (!numero) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(`Hola! Hice el pedido #${pedido.numero} en la web. Quedo atento para coordinar.`)}`;
}

module.exports = { mensajeCliente, linkAdmin, linkCliente, numeroCliente };
