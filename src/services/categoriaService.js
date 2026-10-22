const { Op } = require("sequelize");
const db = require("../model/database/models");
const slug = require("../helpers/slug");

const LARGO = { categoria: 60, subcategoria: 40 };

let menuCache = null;

async function menu() {
  if (!menuCache) {
    const filas = await db.Categoria.findAll({ order: [["orden", "ASC"], ["id", "ASC"]], raw: true });
    menuCache = filas.map(({ id, nombre, slug }) => ({ id, nombre, slug, url: `/categoria/${slug}` }));
  }
  return menuCache;
}

const limpiarMenu = () => (menuCache = null);

async function listarCompletas() {
  const [categorias, conteoCat, conteoSub] = await Promise.all([
    db.Categoria.findAll({
      include: [{ association: "subcategorias" }],
      order: [["orden", "ASC"], ["id", "ASC"], ["subcategorias", "orden", "ASC"], ["subcategorias", "id", "ASC"]],
    }),
    db.Producto.findAll({ attributes: ["categoriaId", [db.sequelize.fn("COUNT", "*"), "n"]], group: ["categoriaId"], raw: true }),
    db.Producto.findAll({
      attributes: ["subcategoriaId", [db.sequelize.fn("COUNT", "*"), "n"]],
      where: { subcategoriaId: { [Op.ne]: null } },
      group: ["subcategoriaId"],
      raw: true,
    }),
  ]);
  const nCat = new Map(conteoCat.map((f) => [f.categoriaId, Number(f.n)]));
  const nSub = new Map(conteoSub.map((f) => [f.subcategoriaId, Number(f.n)]));
  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    slug: c.slug,
    orden: c.orden,
    productos: nCat.get(c.id) || 0,
    subcategorias: c.subcategorias.map((s) => ({ id: s.id, nombre: s.nombre, slug: s.slug, productos: nSub.get(s.id) || 0 })),
  }));
}

async function porSlug(valor) {
  const c = await db.Categoria.findOne({
    where: { slug: String(valor || "") },
    include: [{ association: "subcategorias" }],
    order: [["subcategorias", "orden", "ASC"], ["subcategorias", "id", "ASC"]],
  });
  if (!c) return null;
  return {
    id: c.id,
    nombre: c.nombre,
    slug: c.slug,
    subcategorias: c.subcategorias.map((s) => ({ id: s.id, nombre: s.nombre, slug: s.slug })),
  };
}

async function porNombre(nombre) {
  const c = await db.Categoria.findOne({ where: { nombre: String(nombre || "") }, raw: true });
  return c ? { id: c.id, nombre: c.nombre, slug: c.slug } : null;
}

function nombreValido(texto, tipo) {
  const nombre = String(texto || "").trim().replace(/\s+/g, " ");
  const max = LARGO[tipo];
  if (nombre.length < 2 || nombre.length > max) {
    return { mensaje: `El nombre tiene que tener entre 2 y ${max} letras` };
  }
  const s = slug(nombre, max);
  if (!s) return { mensaje: "Usá letras o números en el nombre" };

  return { nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), slug: s };
}

async function crearCategoria(texto) {
  const v = nombreValido(texto, "categoria");
  if (v.mensaje) return { ok: false, mensaje: v.mensaje };
  if (await db.Categoria.findOne({ where: { [Op.or]: [{ slug: v.slug }, { nombre: v.nombre }] } })) {
    return { ok: false, mensaje: `Ya existe una categoría llamada "${v.nombre}"` };
  }
  const ultimo = (await db.Categoria.max("orden")) || 0;
  const c = await db.Categoria.create({ nombre: v.nombre, slug: v.slug, orden: ultimo + 1 });
  limpiarMenu();
  return { ok: true, categoria: c.get({ plain: true }) };
}

async function renombrarCategoria(id, texto) {
  const c = await db.Categoria.findByPk(id);
  if (!c) return { ok: false, mensaje: "No encontramos esa categoría" };
  const v = nombreValido(texto, "categoria");
  if (v.mensaje) return { ok: false, mensaje: v.mensaje };
  const repetida = await db.Categoria.findOne({
    where: { id: { [Op.ne]: c.id }, [Op.or]: [{ slug: v.slug }, { nombre: v.nombre }] },
  });
  if (repetida) return { ok: false, mensaje: `Ya existe una categoría llamada "${v.nombre}"` };
  await c.update({ nombre: v.nombre, slug: v.slug });
  limpiarMenu();
  return { ok: true, categoria: c.get({ plain: true }) };
}

async function borrarCategoria(id) {
  const c = await db.Categoria.findByPk(id);
  if (!c) return { ok: false, mensaje: "No encontramos esa categoría" };
  const productos = await db.Producto.count({ where: { categoriaId: c.id } });
  if (productos) {
    return {
      ok: false,
      mensaje: `"${c.nombre}" tiene ${productos} ${productos === 1 ? "producto" : "productos"}. Pasalos a otra categoría antes de borrarla.`,
    };
  }
  if ((await db.Categoria.count()) <= 1) return { ok: false, mensaje: "La tienda necesita al menos una categoría" };
  await c.destroy();
  limpiarMenu();
  return { ok: true, categoria: { nombre: c.nombre } };
}

async function moverCategoria(id, direccion) {
  const todas = await db.Categoria.findAll({ order: [["orden", "ASC"], ["id", "ASC"]] });
  const i = todas.findIndex((c) => c.id === Number(id));
  const j = i + (Number(direccion) < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= todas.length) return { ok: false, mensaje: "No se puede mover más" };
  [todas[i], todas[j]] = [todas[j], todas[i]];
  await db.sequelize.transaction(async (t) => {
    for (const [orden, c] of todas.entries()) {
      if (c.orden !== orden + 1) await c.update({ orden: orden + 1 }, { transaction: t });
    }
  });
  limpiarMenu();
  return { ok: true };
}

async function crearSubcategoria(categoriaId, texto) {
  const c = await db.Categoria.findByPk(categoriaId);
  if (!c) return { ok: false, mensaje: "No encontramos esa categoría" };
  const v = nombreValido(texto, "subcategoria");
  if (v.mensaje) return { ok: false, mensaje: v.mensaje };
  const existente = await db.Subcategoria.findOne({ where: { categoriaId: c.id, slug: v.slug } });
  if (existente) {
    return { ok: false, mensaje: `"${c.nombre}" ya tiene una subcategoría "${existente.nombre}"`, subcategoria: existente.get({ plain: true }) };
  }
  const ultimo = (await db.Subcategoria.max("orden", { where: { categoriaId: c.id } })) || 0;
  const s = await db.Subcategoria.create({ categoriaId: c.id, nombre: v.nombre, slug: v.slug, orden: ultimo + 1 });
  return { ok: true, subcategoria: s.get({ plain: true }), categoria: c.nombre };
}

async function renombrarSubcategoria(id, texto) {
  const s = await db.Subcategoria.findByPk(id);
  if (!s) return { ok: false, mensaje: "No encontramos esa subcategoría" };
  const v = nombreValido(texto, "subcategoria");
  if (v.mensaje) return { ok: false, mensaje: v.mensaje };
  const repetida = await db.Subcategoria.findOne({ where: { categoriaId: s.categoriaId, slug: v.slug, id: { [Op.ne]: s.id } } });
  if (repetida) return { ok: false, mensaje: `Ya existe "${repetida.nombre}" en esta categoría` };
  await s.update({ nombre: v.nombre, slug: v.slug });
  return { ok: true, subcategoria: s.get({ plain: true }) };
}

async function borrarSubcategoria(id) {
  const s = await db.Subcategoria.findByPk(id);
  if (!s) return { ok: false, mensaje: "No encontramos esa subcategoría" };
  const productos = await db.Producto.count({ where: { subcategoriaId: s.id } });
  await db.sequelize.transaction(async (t) => {
    await db.Producto.update({ subcategoriaId: null }, { where: { subcategoriaId: s.id }, transaction: t });
    await s.destroy({ transaction: t });
  });
  return { ok: true, subcategoria: { nombre: s.nombre }, productos };
}

module.exports = {
  menu,
  limpiarMenu,
  listarCompletas,
  porSlug,
  porNombre,
  crearCategoria,
  renombrarCategoria,
  borrarCategoria,
  moverCategoria,
  crearSubcategoria,
  renombrarSubcategoria,
  borrarSubcategoria,
};
