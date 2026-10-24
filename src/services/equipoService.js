const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../model/database/models");
const turnos = require("./turnoService");

const CARPETA = path.join(__dirname, "../../public/img/equipo");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const limpiar = (valor, max) => String(valor || "").trim().replace(/\s+/g, " ").slice(0, max);

function borrarFoto(foto) {
  if (!foto || !foto.startsWith("/img/equipo/")) return;
  fs.unlink(path.join(CARPETA, path.basename(foto)), () => {});
}

function claveInvalida(clave) {
  if (String(clave).length < 8) return "La contraseña necesita al menos 8 caracteres";
  if (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return "La contraseña necesita letras y números";
  return null;
}

async function listar() {
  const filas = await db.Barbero.findAll({
    include: [
      { model: db.Sucursal, as: "sucursal", attributes: ["id", "nombre"] },
      { model: db.Usuario, as: "usuario", attributes: ["id", "nombre", "apellido", "email", "telefono"] },
    ],
    order: [["orden", "ASC"], ["id", "ASC"]],
  });
  return filas.map((f) => {
    const b = f.get({ plain: true });
    return {
      id: b.id,
      nombre: b.nombre,
      foto: b.foto,
      activo: b.activo,
      sucursalId: b.sucursalId,
      sucursal: b.sucursal?.nombre || "Sin sucursal",
      email: b.usuario?.email || "",
      telefono: b.usuario?.telefono || "",
    };
  });
}

async function crear(datos, archivo) {
  const nombre = limpiar(datos.nombre, 40);
  const apellido = limpiar(datos.apellido, 40);
  const email = String(datos.email || "").trim().toLowerCase();
  const telefono = limpiar(datos.telefono, 20) || null;
  const sucursalId = Number(datos.sucursalId) || 0;
  const foto = archivo ? `/img/equipo/${archivo.filename}` : null;
  const fallar = (mensaje) => {
    borrarFoto(foto);
    return { ok: false, mensaje };
  };

  if (nombre.length < 2) return fallar("Ingresá el nombre del peluquero");
  if (!EMAIL.test(email)) return fallar("Ingresá un email válido: es con el que va a iniciar sesión");
  const errorClave = claveInvalida(datos.password || "");
  if (errorClave) return fallar(errorClave);
  if (!(await db.Sucursal.findByPk(sucursalId))) return fallar("Elegí la sucursal donde atiende");
  if (await db.Usuario.findOne({ where: { email }, attributes: ["id"] })) return fallar("Ya existe un usuario con ese email");

  const orden = ((await db.Barbero.max("orden")) || 0) + 1;
  await db.sequelize.transaction(async (t) => {
    const usuario = await db.Usuario.create(
      { nombre, apellido, email, telefono, password: await bcrypt.hash(datos.password, 10), rol: "barbero" },
      { transaction: t }
    );
    await db.Barbero.create(
      { nombre: `${nombre} ${apellido}`.trim().slice(0, 60), sucursalId, usuarioId: usuario.id, foto, activo: true, orden },
      { transaction: t }
    );
  });
  return { ok: true };
}

async function actualizar(id, datos, archivo) {
  const barbero = await db.Barbero.findByPk(id);
  const foto = archivo ? `/img/equipo/${archivo.filename}` : null;
  const fallar = (mensaje) => {
    borrarFoto(foto);
    return { ok: false, mensaje };
  };
  if (!barbero) return fallar("No existe ese peluquero");

  const nombre = limpiar(datos.nombre, 40);
  const apellido = limpiar(datos.apellido, 40);
  const sucursalId = Number(datos.sucursalId) || 0;
  if (nombre.length < 2) return fallar("Ingresá el nombre del peluquero");
  if (!(await db.Sucursal.findByPk(sucursalId))) return fallar("Elegí la sucursal donde atiende");
  if (datos.password) {
    const errorClave = claveInvalida(datos.password);
    if (errorClave) return fallar(errorClave);
  }

  const fotoVieja = barbero.foto;
  await db.sequelize.transaction(async (t) => {
    await barbero.update(
      { nombre: `${nombre} ${apellido}`.trim().slice(0, 60), sucursalId, activo: datos.activo === "1", ...(foto ? { foto } : {}) },
      { transaction: t }
    );
    if (barbero.usuarioId) {
      const cambios = { nombre, apellido, telefono: limpiar(datos.telefono, 20) || null };
      if (datos.password) cambios.password = await bcrypt.hash(datos.password, 10);
      await db.Usuario.update(cambios, { where: { id: barbero.usuarioId }, transaction: t });
    }
  });
  if (foto) borrarFoto(fotoVieja);
  return { ok: true };
}

async function eliminar(id) {
  const barbero = await db.Barbero.findByPk(id);
  if (!barbero) return { ok: false, mensaje: "No existe ese peluquero" };

  const { fecha } = turnos.ahora();
  const pendientes = await db.Turno.count({
    where: { barberoId: barbero.id, estado: { [Op.in]: ["reservado", "confirmado"] }, fecha: { [Op.gte]: fecha } },
  });
  if (pendientes) {
    return {
      ok: false,
      mensaje: `${barbero.nombre} tiene ${pendientes} ${pendientes === 1 ? "turno pendiente" : "turnos pendientes"}. Cancelalos o desmarcá “Atiende” para que no reciba más reservas.`,
    };
  }

  await db.sequelize.transaction(async (t) => {
    const usuarioId = barbero.usuarioId;
    await barbero.destroy({ transaction: t });
    if (usuarioId) {
      await db.Notificacion.destroy({ where: { usuarioId }, transaction: t });
      await db.Usuario.destroy({ where: { id: usuarioId, rol: "barbero" }, transaction: t });
    }
  });
  borrarFoto(barbero.foto);
  return { ok: true, nombre: barbero.nombre };
}

async function porUsuario(usuarioId) {
  const b = await db.Barbero.findOne({ where: { usuarioId }, include: [{ model: db.Sucursal, as: "sucursal" }] });
  if (!b) return null;
  const x = b.get({ plain: true });
  return { id: x.id, nombre: x.nombre, foto: x.foto, activo: x.activo, sucursalId: x.sucursalId, sucursal: x.sucursal?.nombre || "" };
}

module.exports = { listar, crear, actualizar, eliminar, porUsuario };
