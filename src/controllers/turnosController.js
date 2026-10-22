const turnos = require("../services/turnoService");

function abrirStream(req, res, filtro) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("event: hola\ndata: {}\n\n");
  const alCambiar = (turno) => {
    if (filtro(turno)) res.write(`event: cambio\ndata: ${JSON.stringify({ estado: turno.estado })}\n\n`);
  };
  turnos.eventos.on("cambio", alCambiar);
  const latido = setInterval(() => res.write(": latido\n\n"), 25000);
  req.on("close", () => {
    clearInterval(latido);
    turnos.eventos.off("cambio", alCambiar);
  });
}

const quiereJson = (req) => req.accepts(["html", "json"]) === "json";

module.exports = {
  async ver(req, res) {
    const [servicios, barberos, dias] = await Promise.all([turnos.servicios(), turnos.barberos(), turnos.diasDisponibles()]);
    res.render("turnos", {
      titulo: "Sacá tu turno",
      estilo: "turnos",
      navActivo: "turnos",
      descripcion: "Reservá tu turno online en Barba Black: elegí el servicio, el día y el horario.",
      servicios,
      barberos,
      dias,
    });
  },

  async disponibilidad(req, res) {
    const r = await turnos.disponibilidad({
      servicioId: req.query.servicio,
      fecha: String(req.query.fecha || ""),
      barberoId: req.query.barbero || null,
    });
    res.status(r.ok ? 200 : 400).json(r);
  },

  async crear(req, res) {
    const r = await turnos.crear({
      servicioId: req.body.servicio,
      barberoId: req.body.barbero || null,
      fecha: String(req.body.fecha || ""),
      hora: String(req.body.hora || ""),
      cliente: req.body.cliente,
      telefono: req.body.telefono,
      notas: req.body.notas,
    });
    if (quiereJson(req)) return res.status(r.ok ? 201 : 409).json(r.ok ? { ok: true, codigo: r.turno.codigo } : r);
    if (!r.ok) {
      req.session.flash = r.mensaje;
      return res.redirect("/turnos");
    }
    res.redirect(`/turnos/${r.turno.codigo}`);
  },

  async detalle(req, res, next) {
    const turno = await turnos.porCodigo(req.params.codigo);
    if (!turno) return next();
    const t = req.app.locals.tienda;
    const texto = `Hola Barba Black! Reservé un turno (${turno.codigo}): ${turno.servicio}, ${turno.fechaTexto} a las ${turno.inicio} hs. A nombre de ${turno.cliente}.`;
    res.render("turno-detalle", {
      titulo: `Turno ${turno.codigo}`,
      estilo: "turnos",
      navActivo: "turnos",
      turno,
      whatsapp: t.whatsapp ? `${t.whatsapp}?text=${encodeURIComponent(texto)}` : "",
      puedeCancelar: ["reservado", "confirmado"].includes(turno.estado),
    });
  },

  async eventos(req, res) {
    const codigo = String(req.params.codigo).toUpperCase();
    abrirStream(req, res, (t) => t.codigo === codigo);
  },

  async cancelar(req, res) {
    const r = await turnos.cancelarPorCodigo(req.params.codigo);
    if (quiereJson(req)) return res.status(r.ok ? 200 : 400).json(r);
    req.session.flash = r.ok ? "Cancelamos tu turno. Ya podés sacar otro cuando quieras." : r.mensaje;
    res.redirect(`/turnos/${req.params.codigo}`);
  },
};
