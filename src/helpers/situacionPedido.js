function situacionPedido(p) {
  if (p.estado === "cancelado") {
    return { clave: "cancelado", texto: "Cancelado", detalle: "Este pedido se canceló." };
  }
  if (p.estado === "vendido") {
    return { clave: "ok", texto: "Vendido", detalle: "Tu compra está confirmada. ¡Gracias!" };
  }
  return { clave: "alerta", texto: "Nuevo", detalle: "Pedido nuevo." };
}

function pasosPedido(p) {
  const vendido = p.estado === "vendido";
  return [
    { texto: "Pedido recibido", fecha: p.fecha, hecho: true, actual: !vendido },
    { texto: "Compra confirmada", fecha: p.vendidoEn, hecho: vendido, actual: vendido },
  ];
}

module.exports = { situacionPedido, pasosPedido };
