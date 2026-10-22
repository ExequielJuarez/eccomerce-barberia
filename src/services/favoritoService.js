const db = require("../model/database/models");
const productoService = require("./productoService");

const usuarioId = (session) => session.usuarioLogueado?.id || null;

async function ids(session) {
  const id = usuarioId(session);
  if (id) {
    const filas = await db.Favorito.findAll({
      where: { usuarioId: id },
      attributes: ["productoId"],
      order: [["creado_en", "DESC"]],
      raw: true,
    });
    return filas.map((f) => f.productoId);
  }
  const guardados = session.favoritos || [];
  if (!guardados.length) return [];
  const existentes = await db.Producto.findAll({ where: { id: guardados }, attributes: ["id"], raw: true });
  const set = new Set(existentes.map((p) => p.id));
  return guardados.filter((x) => set.has(x));
}

async function alternar(session, productoId) {
  const numero = Number(productoId);
  if (!(await db.Producto.count({ where: { id: numero } }))) return null;

  let activo;
  const id = usuarioId(session);
  if (id) {
    const borrados = await db.Favorito.destroy({ where: { usuarioId: id, productoId: numero } });
    activo = borrados === 0;
    if (activo) await db.Favorito.create({ usuarioId: id, productoId: numero });
  } else {
    const lista = (session.favoritos ||= []);
    const i = lista.indexOf(numero);
    activo = i === -1;
    if (activo) lista.unshift(numero);
    else lista.splice(i, 1);
  }
  return { activo, cantidad: (await ids(session)).length };
}

async function vaciar(session) {
  const id = usuarioId(session);
  if (id) await db.Favorito.destroy({ where: { usuarioId: id } });
  session.favoritos = [];
}

async function pasarACuenta(session, idUsuario) {
  const lista = session.favoritos || [];
  if (!lista.length) return;
  const existentes = await db.Producto.findAll({ where: { id: lista }, attributes: ["id"], raw: true });
  await db.Favorito.bulkCreate(
    existentes.map((p) => ({ usuarioId: idUsuario, productoId: p.id })),
    { ignoreDuplicates: true }
  );
  session.favoritos = [];
}

async function productos(session) {
  return productoService.porIds(await ids(session));
}

module.exports = { ids, alternar, vaciar, pasarACuenta, productos };
