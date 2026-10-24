const ROLES = ["cliente", "admin", "superadmin", "barbero"];

const esAdmin = (u) => Boolean(u) && (u.rol === "admin" || u.rol === "superadmin");
const esSuperAdmin = (u) => Boolean(u) && u.rol === "superadmin";
const esBarbero = (u) => Boolean(u) && u.rol === "barbero";

module.exports = { ROLES, esAdmin, esSuperAdmin, esBarbero };
