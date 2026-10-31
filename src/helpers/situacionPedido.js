function situacionPedido(p) {
  if (p.estado === "cancelado") {
    return { clave: "cancelado", texto: "Cancelado", detalle: "Este pedido se canceló." };
  }
  if (p.estado === "vendido") {
    return { clave: "ok", texto: "Vendido", detalle: "Tu compra está confirmada. ¡Gracias!" };
  }
  return { clave: "alerta", texto: "Pendiente", detalle: "Mandá el pedido por WhatsApp al local para confirmarlo." };
}

function pasosPedido(p) {
  const vendido = p.estado === "vendido";
  return [
    { texto: "Pedido recibido", fecha: p.fecha, hecho: true, actual: !vendido },
    { texto: "Compra confirmada", fecha: p.vendidoEn, hecho: vendido, actual: vendido },
  ];
}

module.exports = { situacionPedido, pasosPedido };
