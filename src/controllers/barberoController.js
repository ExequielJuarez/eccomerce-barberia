const turnos = require("../services/turnoService");
const equipo = require("../services/equipoService");

const panel = {
  agenda: "/barbero",
  eventos: "/barbero/eventos",
  notificaciones: "/barbero/notificaciones",
  estado: (id) => `/barbero/turnos/${id}/estado`,
  esBarbero: true,
};

async function miPerfil(req, res) {
  const perfil = await equipo.porUsuario(req.session.usuarioLogueado.id);
  if (!perfil) {
    req.session.flash = "Tu usuario ya no está asociado a un peluquero. Hablá con el administrador.";
    res.redirect("/");
  }
  return perfil;
}

const perfilDe = async (req) => equipo.porUsuario(req.session.usuarioLogueado.id);

module.exports = {
  async nuevo(req, res) {
    const perfil = await miPerfil(req, res);
    if (!perfil) return;
    const [servicios, dias] = await Promise.all([turnos.servicios(), turnos.diasDisponibles()]);
    res.render("admin/turno-nuevo", {
      titulo: "Agregar turno",
      estilo: ["admin", "admin-turnos"],
      usuario: req.session.usuarioLogueado,
      seccion: "mis-turnos",
      turnosPendientes: await turnos.pendientesHoy({ barberoId: perfil.id }),
      rutaNotificaciones: panel.notificaciones,
      perfil,
      servicios,
      dias: dias.filter((d) => d.abierto),
      hoy: turnos.ahora().fecha,
    });
  },

  async disponibilidad(req, res) {
    const perfil = await perfilDe(req);
    if (!perfil) return res.status(403).json({ ok: false, mensaje: "Sin permiso" });
    const r = await turnos.disponibilidad({
      servicioId: req.query.servicio,
      fecha: String(req.query.fecha || ""),
      barberoId: perfil.id,
      interno: true,
    });
    res.status(r.ok ? 200 : 400).json({ ok: r.ok, slots: r.slots, aviso: r.aviso, mensaje: r.mensaje });
  },

  async crear(req, res) {
    const perfil = await perfilDe(req);
    if (!perfil) return res.redirect("/");
    const r = await turnos.crear({
      servicioId: req.body.servicio,
      sucursalId: perfil.sucursalId,
      barberoId: perfil.id,
      fecha: String(req.body.fecha || ""),
      hora: String(req.body.hora || ""),
      cliente: req.body.cliente,
      telefono: req.body.telefono,
      notas: req.body.notas,
      interno: true,
    });
    if (!r.ok) {
      req.session.flash = r.mensaje;
      return res.redirect("/barbero/turnos/nuevo");
    }
    req.session.flash = `Turno cargado: ${r.turno.cliente}, ${r.turno.fechaTexto} a las ${r.turno.inicio} hs.`;
    res.redirect(`/barbero?fecha=${r.turno.fecha}`);
  },

  async agenda(req, res) {
    const perfil = await miPerfil(req, res);
    if (!perfil) return;
    const filtro = { barberoId: perfil.id };
    const hoy = turnos.ahora().fecha;
    const fecha = turnos.fechaValida(req.query.fecha) ? req.query.fecha : hoy;
    const [lista, resumen, proximos, turnosPendientes] = await Promise.all([
      turnos.agenda(fecha, filtro),
      turnos.resumenDia(fecha, filtro),
      turnos.proximos(6, filtro),
      turnos.pendientesHoy(filtro),
    ]);
    res.render("admin/turnos", {
      titulo: "Mis turnos",
      estilo: ["admin", "admin-turnos"],
      usuario: req.session.usuarioLogueado,
      seccion: "mis-turnos",
      turnosPendientes,
      rutaNotificaciones: panel.notificaciones,
      panel,
      perfil,
      fecha,
      hoy,
      anterior: turnos.sumarDias(fecha, -1),
      siguiente: turnos.sumarDias(fecha, 1),
      fechaTexto: turnos.etiquetaFecha(fecha),
      lista,
      resumen,
      proximos,
      whatsapp: turnos.enlaceWhatsapp,
    });
  },

  async cambiarEstado(req, res) {
    const perfil = await equipo.porUsuario(req.session.usuarioLogueado.id);
    const t = perfil && (await turnos.cambiarEstado(req.params.id, req.body.estado, { barberoId: perfil.id }));
    req.session.flash = t ? `Turno de ${t.cliente}: ${t.estado}.` : "No se pudo actualizar el turno.";
    res.redirect(`/barbero?fecha=${t ? t.fecha : turnos.ahora().fecha}`);
  },

  async eventos(req, res) {
    const perfil = await equipo.porUsuario(req.session.usuarioLogueado.id);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("event: hola\ndata: {}\n\n");
    const alCambiar = (t) => perfil && t.barberoId === perfil.id && res.write(`event: cambio\ndata: ${JSON.stringify({ fecha: t.fecha })}\n\n`);
    turnos.eventos.on("cambio", alCambiar);
    const latido = setInterval(() => res.write(": latido\n\n"), 25000);
    req.on("close", () => {
      clearInterval(latido);
      turnos.eventos.off("cambio", alCambiar);
    });
  },
};
