const arrepentimientos = require("../services/arrepentimientoService");

const ACTUALIZADO = "20 de octubre de 2026";

const PAGINAS = [
  { url: "/terminos", titulo: "Términos y condiciones", archivo: "terminos" },
  { url: "/privacidad", titulo: "Política de privacidad", archivo: "privacidad" },
  { url: "/cookies", titulo: "Política de cookies", archivo: "cookies" },
  { url: "/cambios-y-devoluciones", titulo: "Cambios y devoluciones", archivo: "cambios" },
];

const MAX_POR_HORA = 5;

function renderArrepentimiento(res, { datos = {}, errores = {}, status = 200 }) {
  res.status(status).render("arrepentimiento", {
    titulo: "Botón de arrepentimiento",
    estilo: "arrepentimiento",
    datos,
    errores,
  });
}

function validar(d) {
  const errores = {};
  if (d.nombre.length < 2 || d.nombre.length > 90) errores.nombre = { msg: "Escribí tu nombre y apellido" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) || d.email.length > 120) errores.email = { msg: "Ingresá un email válido" };
  if (d.telefono && !/^[0-9+\s()-]{6,20}$/.test(d.telefono)) errores.telefono = { msg: "Ingresá un teléfono válido" };
  if (!/^\d{1,10}$/.test(d.numeroPedido)) errores.numeroPedido = { msg: "Ingresá el número de pedido (solo números, ej: 1024)" };
  if (d.motivo.length > 500) errores.motivo = { msg: "Máximo 500 caracteres" };
  if (!d.confirmo) errores.confirmo = { msg: "Confirmá que querés cancelar la compra" };
  return errores;
}

module.exports = {
  PAGINAS,

  pagina(archivo) {
    const pagina = PAGINAS.find((p) => p.archivo === archivo);
    return (req, res) =>
      res.render("legal", {
        titulo: pagina.titulo,
        estilo: "legal",
        pagina,
        paginas: PAGINAS,
        actualizado: ACTUALIZADO,
      });
  },

  async verArrepentimiento(req, res) {
    const datos = {};
    datos.numeroPedido = String(req.query.pedido || "").replace(/\D/g, "").slice(0, 10);
    renderArrepentimiento(res, { datos });
  },

  async enviarArrepentimiento(req, res) {
    const b = req.body;
    const datos = {
      nombre: String(b.nombre || "").trim(),
      email: String(b.email || "").trim().toLowerCase(),
      telefono: String(b.telefono || "").trim(),
      numeroPedido: String(b.numeroPedido || "").replace(/[#\s]/g, "").trim(),
      motivo: String(b.motivo || "").trim(),
      confirmo: b.confirmo === "1",
    };

    const errores = validar(datos);
    if (Object.keys(errores).length) return renderArrepentimiento(res, { datos, errores, status: 422 });

    const ahora = Date.now();
    req.session.arrepentimientos = (req.session.arrepentimientos || []).filter((t) => ahora - t < 60 * 60 * 1000);
    if (req.session.arrepentimientos.length >= MAX_POR_HORA) {
      return renderArrepentimiento(res, {
        datos,
        errores: { general: { msg: "Ya enviaste varias solicitudes. Si necesitás otra, escribinos por email." } },
        status: 429,
      });
    }

    const solicitud = await arrepentimientos.crear(datos, null);
    req.session.arrepentimientos.push(ahora);

    res.render("arrepentimiento-listo", {
      titulo: "Recibimos tu solicitud",
      estilo: "arrepentimiento",
      solicitud,
    });
  },
};
