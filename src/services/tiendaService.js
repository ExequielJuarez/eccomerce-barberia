const db = require("../model/database/models");
const tienda = require("../helpers/tienda");

const CLAVES = ["whatsapp", "telefono", "email", "direccion", "horarios", "instagram", "usuario", "facebook", "tiktok", "mapa"];

async function cargar() {
  try {
    const filas = await db.Configuracion.findAll({ raw: true });
    tienda.cargar(Object.fromEntries(filas.filter((f) => CLAVES.includes(f.clave)).map((f) => [f.clave, f.valor])));
  } catch (error) {
    console.warn("⚠️  No se pudo leer la configuración de la tienda (¿falta correr database/migracion-simple.sql?):", error.message);
  }
}

async function guardar(valores) {
  await db.sequelize.transaction(async (t) => {
    for (const clave of CLAVES) {
      await db.Configuracion.upsert({ clave, valor: String(valores[clave] ?? "") }, { transaction: t });
    }
  });
  await cargar();
}

module.exports = { CLAVES, cargar, guardar };
