const { EventEmitter } = require("events");
const db = require("../model/database/models");
const { STOCK_BAJO } = require("./productoService");

const eventos = new EventEmitter();
eventos.setMaxListeners(100);

const pesos = (n) => "$" + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function plano(n) {
  const x = n.get ? n.get({ plain: true }) : n;
  return {
    id: x.id,
    tipo: x.tipo,
    titulo: x.titulo,
    mensaje: x.mensaje,
    url: x.url,
    usuarioId: x.usuarioId || null,
    leida: Boolean(x.leida),
    fecha: x.creado_en,
  };
}

async function crear(datos) {
  const notificacion = plano(await db.Notificacion.create(datos));
  eventos.emit("nueva", notificacion);
  return notificacion;
}

async function nuevoPedido(pedido) {
  const unidades = pedido.items.reduce((acc, i) => acc + i.cantidad, 0);
  await crear({
    tipo: "pedido",
    titulo: `Nueva compra #${pedido.numero}`,
    mensaje: `${pedido.cliente} · ${pesos(pedido.total)} · ${unidades} ${unidades === 1 ? "unidad" : "unidades"} · ${pedido.entrega === "retiro" ? "retira en el local" : "envío a domicilio"}`,
    url: `/admin/pedidos?q=${pedido.numero}`,
    pedidoId: pedido.numero,
  });

  const ids = [...new Set(pedido.items.map((i) => i.productoId).filter(Boolean))];
  const productos = await db.Producto.findAll({ where: { id: ids }, attributes: ["id", "nombre", "stock"], raw: true });
  for (const p of productos.filter((x) => x.stock <= STOCK_BAJO)) {
    await crear({
      tipo: "stock",
      titulo: p.stock === 0 ? "Producto sin stock" : "Stock bajo",
      mensaje: `${p.nombre} · ${p.stock === 0 ? "se agotó" : `quedan ${p.stock}`}`,
      url: `/admin/productos/${p.id}`,
      productoId: p.id,
    });
  }
}

async function listar(limite = 15, usuarioId = null) {
  const [filas, noLeidas] = await Promise.all([
    db.Notificacion.findAll({ where: { usuarioId }, order: [["creado_en", "DESC"], ["id", "DESC"]], limit: limite }),
    db.Notificacion.count({ where: { usuarioId, leida: false } }),
  ]);
  return { notificaciones: filas.map(plano), noLeidas };
}

async function noLeidas(usuarioId = null) {
  return db.Notificacion.count({ where: { usuarioId, leida: false } });
}

async function marcarLeidas(id = null, usuarioId = null) {
  await db.Notificacion.update({ leida: true }, { where: id ? { id, usuarioId } : { usuarioId, leida: false } });
  const cantidad = await noLeidas(usuarioId);
  eventos.emit("leidas", { noLeidas: cantidad, usuarioId });
  return cantidad;
}

module.exports = { eventos, crear, nuevoPedido, listar, noLeidas, marcarLeidas };
