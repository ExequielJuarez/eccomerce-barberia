const bcrypt = require("bcryptjs");
const db = require("../model/database/models");

const HASH_FALSO = bcrypt.hashSync("no-es-una-clave-real", 12);

function publico(usuario) {
  if (!usuario) return null;
  const { id, nombre, apellido, email, rol } = usuario.get ? usuario.get({ plain: true }) : usuario;
  return { id, nombre, apellido, email, rol };
}

// Siempre compara contra un hash (real o falso) para que el tiempo de respuesta no delate si el usuario existe.
async function verificar(email, password) {
  const usuario = await db.Usuario.scope("conPassword").findOne({
    where: { email: String(email).trim().toLowerCase() },
  });

  const ok = await bcrypt.compare(String(password), usuario?.password || HASH_FALSO);
  if (!usuario || !usuario.password || !ok) return null;
  return publico(usuario);
}

const hashear = (password) => bcrypt.hash(String(password), 12);

module.exports = { hashear, publico, verificar };
