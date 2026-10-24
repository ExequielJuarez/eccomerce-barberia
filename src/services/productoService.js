const { Op } = require("sequelize");
const db = require("../model/database/models");

const STOCK_BAJO = 5;
const MAX_IMAGENES = 8;

const POR_DEFECTO = {
  cuotas: 6,
  resumen: "Producto profesional seleccionado por La Vecindad.",
  descripcion: ["Descripción del producto."],
  destacados: ["Seleccionado por La Vecindad"],
};

const incluir = [
  { association: "categoria", attributes: ["id", "nombre", "slug"] },
  { association: "color", attributes: ["id", "valor", "nombre", "hex"] },
  { association: "imagenes", attributes: ["id", "ruta", "orden"] },
  { association: "colores", attributes: ["id", "valor", "nombre", "hex"], through: { attributes: ["orden"] } },
  { association: "subcategoria", attributes: ["id", "nombre", "slug"], required: false },
];

const ordenImagenes = ["imagenes", "orden", "ASC"];

function plano(p) {
  if (!p) return null;
  const x = p.get({ plain: true });
  const parrafos = (texto) => (texto ? texto.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean) : null);
  const lineas = (texto) => (texto ? texto.split("\n").map((t) => t.trim()).filter(Boolean) : null);

  const colores = (x.colores || [])
    .sort((a, b) => (a.ProductoColor?.orden ?? 0) - (b.ProductoColor?.orden ?? 0) || (a.id === x.colorId ? -1 : 1))
    .map(({ id, valor, nombre, hex }) => ({ id, valor, nombre, hex }));
  if (!colores.length && x.color) colores.push({ id: x.color.id, valor: x.color.valor, nombre: x.color.nombre, hex: x.color.hex });

  return {
    id: x.id,
    nombre: x.nombre,
    categoriaId: x.categoriaId,
    categoria: x.categoria?.nombre || "",
    categoriaSlug: x.categoria?.slug || "",
    subcategoriaId: x.subcategoriaId || null,
    subcategoria: x.subcategoria?.nombre || "",
    subcategoriaSlug: x.subcategoria?.slug || "",
    colorId: x.colorId,
    color: x.color?.valor || "",
    colorInfo: x.color || null,
    colores,
    precio: x.precio,
    costo: x.costo,
    stock: x.stock,
    etiqueta: x.etiqueta,

    imagenes: (x.imagenes || []).sort((a, b) => a.orden - b.orden || a.id - b.id).map(({ id, ruta }) => ({ id, ruta })),
    imagen: (x.imagenes || []).sort((a, b) => a.orden - b.orden || a.id - b.id)[0]?.ruta || null,
    cuotas: POR_DEFECTO.cuotas,

    crudo: { resumen: x.resumen || "", descripcion: x.descripcion || "", destacados: x.destacados || "" },
    resumen: x.resumen || POR_DEFECTO.resumen,
    descripcion: parrafos(x.descripcion) || POR_DEFECTO.descripcion,
    destacados: lineas(x.destacados) || POR_DEFECTO.destacados,
    especificaciones: (x.especificaciones || []).sort((a, b) => a.orden - b.orden).map((e) => [e.clave, e.valor]),
  };
}

async function listar({ q = "", categoria = "", categoriaId = null, stock = "", orden = "" } = {}) {
  const where = {};
  const texto = q.trim();
  if (texto) {

    where[Op.or] = [
      { nombre: { [Op.like]: `%${texto}%` } },
      { "$categoria.nombre$": { [Op.like]: `%${texto}%` } },
      { "$subcategoria.nombre$": { [Op.like]: `%${texto}%` } },
      ...(/^\d+$/.test(texto) ? [{ id: Number(texto) }] : []),
    ];
  }
  if (categoriaId) where.categoriaId = categoriaId;
  if (stock === "sin") where.stock = 0;
  if (stock === "bajo") where.stock = { [Op.between]: [1, STOCK_BAJO] };

  const ordenes = {
    nombre: [["nombre", "ASC"]],
    "precio-desc": [["precio", "DESC"]],
    "stock-asc": [["stock", "ASC"]],
    "margen-desc": [[db.sequelize.literal("(precio - costo) / precio"), "DESC"]],
  };

  const filas = await db.Producto.findAll({
    where,
    include: [
      { ...incluir[0], ...(categoria ? { where: { nombre: categoria } } : {}) },
      incluir[1],
      incluir[2],
      incluir[3],
      incluir[4],
    ],
    order: [...(ordenes[orden] || [["id", "ASC"]]), ordenImagenes],
  });
  return filas.map(plano);
}

async function obtener(id) {
  const p = await db.Producto.findByPk(id, {
    include: [...incluir, { association: "especificaciones" }],
    order: [ordenImagenes],
  });
  return plano(p);
}

async function porIds(ids) {
  if (!ids.length) return [];
  const filas = await db.Producto.findAll({ where: { id: ids }, include: incluir, order: [ordenImagenes] });
  const mapa = new Map(filas.map((p) => [p.id, plano(p)]));
  return ids.map((id) => mapa.get(Number(id))).filter(Boolean);
}

async function relacionados(id, cantidad = 4) {
  const actual = await db.Producto.findByPk(id);
  if (!actual) return [];
  const filas = await db.Producto.findAll({
    where: { id: { [Op.ne]: actual.id } },
    include: incluir,
    order: [

      [db.sequelize.literal(`\`Producto\`.\`subcategoria_id\` <=> ${actual.subcategoriaId ? Number(actual.subcategoriaId) : -1}`), "DESC"],
      [db.sequelize.literal(`\`Producto\`.\`categoria_id\` = ${Number(actual.categoriaId)}`), "DESC"],
      ["id", "ASC"],
    ],
  });
  return filas.map(plano).slice(0, cantidad);
}

async function categorias() {
  const filas = await db.Categoria.findAll({ order: [["orden", "ASC"]] });
  return filas.map((c) => c.nombre);
}

async function colores() {
  const filas = await db.Color.findAll({ order: [["orden", "ASC"], ["id", "ASC"]], raw: true });
  return filas.map(({ valor, nombre, hex }) => ({ valor, nombre, hex }));
}

const valorDeColor = (nombre) =>
  String(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

async function crearColor({ nombre, hex }) {
  const limpio = String(nombre || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const valor = valorDeColor(limpio);
  if (!valor) return null;
  const existente = await db.Color.findOne({ where: { valor } });
  if (existente) return { valor: existente.valor, nombre: existente.nombre, hex: existente.hex, nuevo: false };
  const ultimo = (await db.Color.max("orden")) || 0;
  const color = await db.Color.create({
    valor,
    nombre: limpio.charAt(0).toUpperCase() + limpio.slice(1),
    hex: /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "#999999",
    orden: ultimo + 1,
  });
  return { valor: color.valor, nombre: color.nombre, hex: color.hex, nuevo: true };
}

const listaDeColores = (v) => [...new Set([].concat(v || []).map(String).filter(Boolean))];

async function resumenStock() {
  const [fila] = await db.sequelize.query(
    `SELECT COALESCE(SUM(stock), 0) AS unidades,
            COALESCE(SUM(stock * costo), 0) AS valorCosto,
            COALESCE(SUM(stock * precio), 0) AS valorVenta
       FROM productos`,
    { type: db.Sequelize.QueryTypes.SELECT }
  );
  const alertas = await db.Producto.findAll({
    where: { stock: { [Op.lte]: STOCK_BAJO } },
    include: incluir,
    order: [["stock", "ASC"], ordenImagenes],
  });
  const lista = alertas.map(plano);
  return {
    unidades: Number(fila.unidades),
    valorCosto: Number(fila.valorCosto),
    valorVenta: Number(fila.valorVenta),
    sinStock: lista.filter((p) => p.stock === 0),
    bajo: lista.filter((p) => p.stock > 0),
  };
}

async function total() {
  return db.Producto.count();
}

async function datosParaGuardar(datos) {
  const valores = listaDeColores(datos.colores);
  const [categoria, filasColor] = await Promise.all([
    db.Categoria.findOne({ where: { nombre: datos.categoria } }),
    db.Color.findAll({ where: { valor: valores } }),
  ]);
  const colorIds = valores.map((v) => filasColor.find((c) => c.valor === v)?.id).filter(Boolean);

  const subcategoria = datos.subcategoria
    ? await db.Subcategoria.findOne({ where: { id: Number(datos.subcategoria) || 0, categoriaId: categoria.id } })
    : null;
  return {
    colorIds,
    nombre: String(datos.nombre).trim(),
    categoriaId: categoria.id,
    subcategoriaId: subcategoria ? subcategoria.id : null,
    colorId: colorIds[0],
    precio: Number(datos.precio),
    costo: Number(datos.costo),
    stock: Math.max(0, parseInt(datos.stock, 10) || 0),
    etiqueta: String(datos.etiqueta || "").trim() || null,
    resumen: String(datos.resumen || "").trim().slice(0, 255) || null,
    descripcion: String(datos.descripcion || "").replace(/\r\n?/g, "\n").trim().slice(0, 4000) || null,
    destacados: String(datos.destacados || "").replace(/\r\n?/g, "\n").trim().slice(0, 1000) || null,
  };
}

async function guardarImagenes(productoId, { nuevas = [], quitar = [], principal = "" } = {}, t) {
  const existentes = await db.ProductoImagen.findAll({
    where: { productoId },
    order: [["orden", "ASC"], ["id", "ASC"]],
    transaction: t,
  });
  const idsQuitar = new Set(quitar.map(Number));
  const borradas = existentes.filter((i) => idsQuitar.has(i.id));
  if (borradas.length) {
    await db.ProductoImagen.destroy({ where: { id: borradas.map((i) => i.id) }, transaction: t });
  }

  const quedan = existentes.filter((i) => !idsQuitar.has(i.id));
  const creadas = [];
  for (const [n, ruta] of nuevas.entries()) {
    creadas.push({ clave: `n-${n}`, fila: await db.ProductoImagen.create({ productoId, ruta, orden: 999 }, { transaction: t }) });
  }

  const todas = [...quedan.map((fila) => ({ clave: `e-${fila.id}`, fila })), ...creadas];
  const i = todas.findIndex((x) => x.clave === principal);
  if (i > 0) todas.unshift(...todas.splice(i, 1));
  for (const [orden, { fila }] of todas.entries()) {
    if (fila.orden !== orden) await fila.update({ orden }, { transaction: t });
  }

  return borradas.map((i) => i.ruta);
}

async function contarImagenes(productoId) {
  return productoId ? db.ProductoImagen.count({ where: { productoId } }) : 0;
}

async function guardarColores(productoId, colorIds, t) {
  await db.ProductoColor.destroy({ where: { productoId }, transaction: t });
  await db.ProductoColor.bulkCreate(
    colorIds.map((colorId, orden) => ({ productoId, colorId, orden })),
    { transaction: t }
  );
}

async function crear(datos, imagenes = {}) {
  const id = await db.sequelize.transaction(async (t) => {
    const { colorIds, ...campos } = await datosParaGuardar(datos);
    const producto = await db.Producto.create(campos, { transaction: t });
    await guardarColores(producto.id, colorIds, t);
    await guardarImagenes(producto.id, imagenes, t);
    return producto.id;
  });
  return obtener(id);
}

async function actualizar(id, datos, imagenes = {}) {
  const producto = await db.Producto.findByPk(id);
  if (!producto) return null;
  const rutasBorradas = await db.sequelize.transaction(async (t) => {
    const { colorIds, ...campos } = await datosParaGuardar(datos);
    await producto.update(campos, { transaction: t });
    await guardarColores(producto.id, colorIds, t);
    return guardarImagenes(producto.id, imagenes, t);
  });
  return { producto: await obtener(id), rutasBorradas };
}

async function eliminar(id) {
  const producto = await obtener(id);
  if (!producto) return null;
  await db.Producto.destroy({ where: { id } });
  return producto;
}

async function ajustarStock(id, { cambio, valor }) {
  const producto = await db.Producto.findByPk(id);
  if (!producto) return null;
  const nuevo = valor !== undefined ? valor : producto.stock + cambio;
  await producto.update({ stock: Math.max(0, nuevo) });
  return producto.stock;
}

module.exports = {
  STOCK_BAJO,
  MAX_IMAGENES,
  contarImagenes,
  listar,
  obtener,
  porIds,
  relacionados,
  categorias,
  colores,
  crearColor,
  listaDeColores,
  resumenStock,
  total,
  crear,
  actualizar,
  eliminar,
  ajustarStock,
};
