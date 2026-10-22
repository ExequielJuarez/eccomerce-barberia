const bcrypt = require("bcryptjs");
const db = require("../model/database/models");

const HASH_FALSO = bcrypt.hashSync("no-es-una-clave-real", 10);

function publico(usuario) {
  if (!usuario) return null;
  const { id, nombre, apellido, email, telefono, rol, googleId } = usuario.get ? usuario.get({ plain: true }) : usuario;
  return { id, nombre, apellido, email, telefono: telefono || "", rol, googleId };
}

async function buscarPorId(id) {
  return publico(await db.Usuario.findByPk(id));
}

async function buscarPorEmail(email) {
  return publico(await db.Usuario.findOne({ where: { email: String(email).trim().toLowerCase() } }));
}

async function verificar(email, password) {
  const usuario = await db.Usuario.scope("conPassword").findOne({
    where: { email: String(email).trim().toLowerCase() },
  });

  const ok = await bcrypt.compare(String(password), usuario?.password || HASH_FALSO);
  if (!usuario || !usuario.password || !ok) return null;
  return publico(usuario);
}

async function crear({ nombre, apellido, email, telefono = null, password = null, passwordHash = null, googleId = null, newsletter = false }) {
  const usuario = await db.Usuario.create({
    nombre,
    apellido: apellido || "",
    email,
    telefono: telefono || null,
    password: passwordHash || (password ? await bcrypt.hash(password, 10) : null),
    googleId,
    newsletter,
  });
  return publico(usuario);
}

async function desdeGoogle({ googleId, email, nombre, apellido }) {
  let usuario = await db.Usuario.findOne({ where: { googleId } });
  if (!usuario) usuario = await db.Usuario.findOne({ where: { email: String(email).toLowerCase() } });
  if (usuario) {
    if (!usuario.googleId) await usuario.update({ googleId });
    return publico(usuario);
  }
  return crear({ nombre, apellido, email, googleId });
}

async function perfil(id) {
  const usuario = await db.Usuario.scope("conPassword").findByPk(id);
  if (!usuario) return null;
  const x = usuario.get({ plain: true });
  return {
    ...publico(usuario),
    dni: x.dni || "",
    calle: x.calle || "",
    numero: x.altura || "",
    piso: x.piso || "",
    codigoPostal: x.codigoPostal || "",
    ciudad: x.ciudad || "",
    provincia: x.provincia || "",
    tieneClave: Boolean(x.password),
    tieneDireccion: Boolean(x.calle && x.codigoPostal),
  };
}

async function actualizarPerfil(id, datos) {
  const usuario = await db.Usuario.findByPk(id);
  const vacio = (v) => (v === undefined ? undefined : String(v).trim() || null);
  await usuario.update({
    nombre: String(datos.nombre).trim(),
    apellido: String(datos.apellido).trim(),
    email: datos.email,
    telefono: vacio(datos.telefono),
    dni: vacio(datos.dni),
    calle: vacio(datos.calle),
    altura: vacio(datos.numero),
    piso: vacio(datos.piso),
    codigoPostal: vacio(datos.codigoPostal),
    ciudad: vacio(datos.ciudad),
    provincia: vacio(datos.provincia),
  });
  return publico(usuario);
}

async function guardarDireccionSiFalta(id, datos) {
  const usuario = await db.Usuario.findByPk(id);
  if (!usuario) return;
  const cambios = {};
  if (!usuario.dni && datos.dni) cambios.dni = datos.dni;
  if (!usuario.telefono && datos.telefono) cambios.telefono = datos.telefono;
  if (!usuario.calle && datos.entrega === "domicilio" && datos.calle) {
    Object.assign(cambios, {
      calle: datos.calle,
      altura: datos.numero,
      piso: datos.piso || null,
      codigoPostal: datos.codigoPostal,
      ciudad: datos.ciudad,
      provincia: datos.provincia,
    });
  }
  if (Object.keys(cambios).length) await usuario.update(cambios);
}

async function cambiarClave(id, actual, nueva, { sinActual = false } = {}) {
  const usuario = await db.Usuario.scope("conPassword").findByPk(id);
  if (!usuario) return false;
  if (!sinActual && usuario.password && !(await bcrypt.compare(String(actual || ""), usuario.password))) return false;
  await usuario.update({ password: await bcrypt.hash(nueva, 10) });
  return true;
}

const hashear = (password) => bcrypt.hash(String(password), 10);

module.exports = {
  hashear,
  publico,
  buscarPorId,
  buscarPorEmail,
  verificar,
  crear,
  desdeGoogle,
  perfil,
  actualizarPerfil,
  guardarDireccionSiFalta,
  cambiarClave,
};
