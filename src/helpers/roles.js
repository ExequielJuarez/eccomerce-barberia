const ROLES = ["cliente", "admin", "superadmin"];

const esAdmin = (u) => Boolean(u) && (u.rol === "admin" || u.rol === "superadmin");
const esSuperAdmin = (u) => Boolean(u) && u.rol === "superadmin";

module.exports = { ROLES, esAdmin, esSuperAdmin };
