const { Op } = require("sequelize");
const db = require("../model/database/models");

const LARGO = 24;
// "Nuevo" alimenta la sección de nuevos ingresos de la tienda: no se puede renombrar ni borrar.
const FIJA = "Nuevo";
const esFija = (nombre) => String(nombre).toLowerCase() === FIJA.toLowerCase();
const limpiar = (v) => String(v || "").replace(/\s+/g, " ").trim();

// Crea la tabla si falta y, la primera vez, carga las etiquetas que ya usaban los productos.
async function iniciar() {
  try {
    await db.Etiqueta.sync();
    if (!(await db.Etiqueta.count({ where: { nombre: FIJA } }))) await db.Etiqueta.create({ nombre: FIJA, orden: 0 });
    if ((await db.Etiqueta.count()) > 1) return;
    const filas = await db.Producto.findAll({ attributes: ["etiqueta"], where: { etiqueta: { [Op.ne]: null } }, group: ["etiqueta"], raw: true });
    const nombres = [...new Set(filas.map((f) => limpiar(f.etiqueta)).filter((n) => n && !esFija(n)))];
    await db.Etiqueta.bulkCreate(nombres.map((nombre, i) => ({ nombre, orden: i + 1 })), { ignoreDuplicates: true });
  } catch (error) {
    console.warn("⚠️  No se pudieron preparar las etiquetas:", error.message);
  }
}

async function nombres() {
  const filas = await db.Etiqueta.findAll({ order: [["orden", "ASC"], ["id", "ASC"]], raw: true });
  return filas.map((f) => f.nombre);
}

async function listar() {
  const filas = await db.Etiqueta.findAll({ order: [["orden", "ASC"], ["id", "ASC"]], raw: true });
  return Promise.all(filas.map(async (f) => ({ ...f, fija: esFija(f.nombre), productos: await db.Producto.count({ where: { etiqueta: f.nombre } }) })));
}

async function existe(nombre, exceptoId = null) {
  const filas = await db.Etiqueta.findAll({ raw: true });
  return filas.some((f) => f.id !== Number(exceptoId) && f.nombre.toLowerCase() === nombre.toLowerCase());
}

function validar(nombre) {
  if (!nombre) return "Escribí el nombre de la etiqueta";
  if (nombre.length > LARGO) return `Máximo ${LARGO} caracteres`;
  return null;
}

async function crear(valor) {
  const nombre = limpiar(valor);
  const error = validar(nombre) || ((await existe(nombre)) ? "Esa etiqueta ya existe" : null);
  if (error) return { ok: false, mensaje: error };
  const orden = ((await db.Etiqueta.max("orden")) ?? -1) + 1;
  return { ok: true, etiqueta: (await db.Etiqueta.create({ nombre, orden })).get({ plain: true }) };
}

// Al renombrar, los productos que la usaban pasan a llevar el nombre nuevo.
async function renombrar(id, valor) {
  const nombre = limpiar(valor);
  const etiqueta = await db.Etiqueta.findByPk(id);
  if (!etiqueta) return { ok: false, mensaje: "No encontramos esa etiqueta" };
  if (esFija(etiqueta.nombre)) return { ok: false, mensaje: `La etiqueta "${FIJA}" es fija: arma la sección de nuevos ingresos.` };
  const error = validar(nombre) || ((await existe(nombre, id)) ? "Esa etiqueta ya existe" : null);
  if (error) return { ok: false, mensaje: error };
  await db.sequelize.transaction(async (t) => {
    await db.Producto.update({ etiqueta: nombre }, { where: { etiqueta: etiqueta.nombre }, transaction: t });
    await etiqueta.update({ nombre }, { transaction: t });
  });
  return { ok: true, etiqueta: etiqueta.get({ plain: true }) };
}

// Al borrar, los productos que la usaban quedan sin etiqueta.
async function borrar(id) {
  const etiqueta = await db.Etiqueta.findByPk(id);
  if (!etiqueta) return { ok: false, mensaje: "No encontramos esa etiqueta" };
  if (esFija(etiqueta.nombre)) return { ok: false, mensaje: `La etiqueta "${FIJA}" es fija: arma la sección de nuevos ingresos.` };
  const productos = await db.Producto.count({ where: { etiqueta: etiqueta.nombre } });
  await db.sequelize.transaction(async (t) => {
    await db.Producto.update({ etiqueta: null }, { where: { etiqueta: etiqueta.nombre }, transaction: t });
    await etiqueta.destroy({ transaction: t });
  });
  return { ok: true, etiqueta: etiqueta.get({ plain: true }), productos };
}

module.exports = { iniciar, nombres, listar, crear, renombrar, borrar, LARGO };
