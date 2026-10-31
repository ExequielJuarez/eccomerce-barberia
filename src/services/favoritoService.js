const db = require("../model/database/models");
const productoService = require("./productoService");

// Los favoritos viven en la sesión del visitante (no hay cuentas de clientes).
async function ids(session) {
  const guardados = session.favoritos || [];
  if (!guardados.length) return [];
  const existentes = await db.Producto.findAll({ where: { id: guardados }, attributes: ["id"], raw: true });
  const set = new Set(existentes.map((p) => p.id));
  return guardados.filter((x) => set.has(x));
}

async function alternar(session, productoId) {
  const numero = Number(productoId);
  if (!Number.isInteger(numero) || !(await db.Producto.count({ where: { id: numero } }))) return null;

  const lista = (session.favoritos ||= []);
  const i = lista.indexOf(numero);
  const activo = i === -1;
  if (activo) lista.unshift(numero);
  else lista.splice(i, 1);
  if (lista.length > 200) lista.length = 200;
  return { activo, cantidad: (await ids(session)).length };
}

async function vaciar(session) {
  session.favoritos = [];
}

async function productos(session) {
  return productoService.porIds(await ids(session));
}

module.exports = { ids, alternar, vaciar, productos };
