const { Op } = require("sequelize");
const db = require("../model/database/models");
const productoService = require("./productoService");

const ENVIO_GRATIS_DESDE = 150000;
const COSTO_ENVIO = 6500;
const MAX_POR_ITEM = 20;

function obtener(session) {
  if (!session.carrito) {
    session.carrito = { items: [], cupon: null, entrega: "domicilio", codigoPostal: null };
  }
  return session.carrito;
}

function cantidadTotal(session) {
  return (session.carrito?.items || []).reduce((acc, i) => acc + i.cantidad, 0);
}

async function agregar(session, { id, cantidad = 1, color = null }) {
  const producto = await productoService.obtener(id);
  if (!producto) return { ok: false, mensaje: "Producto no encontrado" };
  if (producto.stock <= 0) return { ok: false, mensaje: "Este producto no tiene stock por ahora" };

  const carrito = obtener(session);

  const colorFinal =
    producto.colores.length > 1
      ? (producto.colores.find((c) => c.nombre === color) || producto.colores[0]).nombre
      : null;

  const clave = `${producto.id}-${colorFinal || "unico"}`;
  const existente = carrito.items.find((i) => i.clave === clave);
  const suma = Math.max(1, Number(cantidad) || 1);

  if (existente) {
    existente.cantidad = Math.min(existente.cantidad + suma, MAX_POR_ITEM, producto.stock);
  } else {
    carrito.items.push({ clave, id: producto.id, color: colorFinal, cantidad: Math.min(suma, MAX_POR_ITEM, producto.stock) });
  }
  return { ok: true };
}

async function actualizar(session, clave, cantidad) {
  const item = obtener(session).items.find((i) => i.clave === clave);
  if (!item) return false;
  const producto = await productoService.obtener(item.id);
  if (!producto) return false;
  item.cantidad = Math.min(Math.max(1, Number(cantidad) || 1), MAX_POR_ITEM, Math.max(1, producto.stock));
  return true;
}

function quitar(session, clave) {
  const carrito = obtener(session);
  carrito.items = carrito.items.filter((i) => i.clave !== clave);
}

function vaciar(session) {
  const carrito = obtener(session);
  carrito.items = [];
  carrito.cupon = null;
}

async function buscarCupon(codigo) {
  if (!codigo) return null;
  return db.Cupon.findOne({
    where: {
      codigo: String(codigo).trim().toUpperCase(),
      activo: true,
      [Op.or]: [{ venceEn: null }, { venceEn: { [Op.gt]: new Date() } }],
    },
    raw: true,
  });
}

async function aplicarCupon(session, codigo) {
  const cupon = await buscarCupon(codigo);
  if (!cupon) return false;
  obtener(session).cupon = cupon.codigo;
  return true;
}

function quitarCupon(session) {
  obtener(session).cupon = null;
}

function fijarEntrega(session, entrega) {
  if (["domicilio", "retiro"].includes(entrega)) obtener(session).entrega = entrega;
}

function fijarCodigoPostal(session, cp) {
  if (!/^\d{4}$/.test(String(cp || ""))) return false;
  obtener(session).codigoPostal = String(cp);
  return true;
}

async function resumen(session) {
  const carrito = obtener(session);

  const productos = await productoService.porIds([...new Set(carrito.items.map((i) => i.id))]);
  const porId = new Map(productos.map((p) => [p.id, p]));

  carrito.items = carrito.items.filter((i) => porId.has(i.id));

  const items = carrito.items.map((i) => {
    const producto = porId.get(i.id);
    return { ...i, producto, subtotal: producto.precio * i.cantidad };
  });

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const cuponDb = await buscarCupon(carrito.cupon);
  if (!cuponDb) carrito.cupon = null;
  const cupon = cuponDb ? { codigo: cuponDb.codigo, descripcion: cuponDb.descripcion, porcentaje: Number(cuponDb.porcentaje) } : null;
  const descuentoCupon = cupon ? Math.round(subtotal * cupon.porcentaje) : 0;

  const entrega = carrito.entrega || "domicilio";
  const envioGratis = subtotal >= ENVIO_GRATIS_DESDE;
  let envio = null;
  if (envioGratis || entrega === "retiro") envio = 0;
  else if (carrito.codigoPostal) envio = COSTO_ENVIO;

  return {
    items,
    cantidad: items.reduce((acc, i) => acc + i.cantidad, 0),
    subtotal,
    cupon,
    descuentoCupon,
    codigoPostal: carrito.codigoPostal,
    entrega,
    costoEnvio: COSTO_ENVIO,
    envio,
    envioGratis,
    envioGratisDesde: ENVIO_GRATIS_DESDE,
    faltaEnvioGratis: Math.max(0, ENVIO_GRATIS_DESDE - subtotal),
    progresoEnvio: Math.min(100, Math.round((subtotal / ENVIO_GRATIS_DESDE) * 100)),
    total: subtotal - descuentoCupon + (envio || 0),
  };
}

module.exports = {
  cantidadTotal,
  agregar,
  actualizar,
  quitar,
  vaciar,
  aplicarCupon,
  quitarCupon,
  fijarEntrega,
  fijarCodigoPostal,
  resumen,
};
