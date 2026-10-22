const turnos = require("../services/turnoService");
const productoService = require("../services/productoService");
const pedidoService = require("../services/pedidoService");

async function contexto(req, extra) {
  const [totalProductos, pedidosPendientes, turnosPendientes] = await Promise.all([
    productoService.total(),
    pedidoService.pendientes(),
    turnos.pendientesHoy(),
  ]);
  return { usuario: req.session.usuarioLogueado, seccion: "turnos", totalProductos, pedidosPendientes, turnosPendientes, ...extra };
}

const volver = (req, res, destino, mensaje) => {
  if (mensaje) req.session.flash = mensaje;
  res.redirect(destino);
};

module.exports = {
  async eventos(req, res) {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("event: hola\ndata: {}\n\n");
    const alCambiar = (t) => res.write(`event: cambio\ndata: ${JSON.stringify({ fecha: t.fecha })}\n\n`);
    turnos.eventos.on("cambio", alCambiar);
    const latido = setInterval(() => res.write(": latido\n\n"), 25000);
    req.on("close", () => {
      clearInterval(latido);
      turnos.eventos.off("cambio", alCambiar);
    });
  },

  async agenda(req, res) {
    const hoy = turnos.ahora().fecha;
    const fecha = turnos.fechaValida(req.query.fecha) ? req.query.fecha : hoy;
    const [lista, resumen, proximos] = await Promise.all([turnos.agenda(fecha), turnos.resumenDia(fecha), turnos.proximos(6)]);
    res.render(
      "admin/turnos",
      await contexto(req, {
        titulo: "Turnos",
        estilo: ["admin", "admin-turnos"],
        fecha,
        hoy,
        anterior: turnos.sumarDias(fecha, -1),
        siguiente: turnos.sumarDias(fecha, 1),
        fechaTexto: turnos.etiquetaFecha(fecha),
        lista,
        resumen,
        proximos,
        whatsapp: turnos.enlaceWhatsapp,
      })
    );
  },

  async cambiarEstado(req, res) {
    const t = await turnos.cambiarEstado(req.params.id, req.body.estado);
    volver(req, res, `/admin/turnos?fecha=${t ? t.fecha : turnos.ahora().fecha}`, t ? `Turno de ${t.cliente}: ${t.estado}.` : "No se pudo actualizar el turno.");
  },

  async config(req, res) {
    const [servicios, barberos, horarios, bloqueos] = await Promise.all([
      turnos.servicios({ soloActivos: false }),
      turnos.barberos({ soloActivos: false }),
      turnos.horarios(),
      turnos.bloqueos(),
    ]);
    const tienda = req.app.locals.tienda;
    const base = (tienda.web ? `https://${tienda.web}` : `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    res.render(
      "admin/turnos-config",
      await contexto(req, {
        titulo: "Servicios y horarios",
        estilo: ["admin", "admin-turnos"],
        servicios,
        barberos,
        horarios,
        bloqueos,
        dias: turnos.DIAS,
        enlace: `${base}/turnos`,
        hoy: turnos.ahora().fecha,
      })
    );
  },

  async guardarServicio(req, res) {
    const r = await turnos.guardarServicio(req.params.id || null, req.body);
    volver(req, res, "/admin/turnos/config#servicios", r.ok ? "Servicio guardado." : r.mensaje);
  },

  async borrarServicio(req, res) {
    await turnos.borrarServicio(req.params.id);
    volver(req, res, "/admin/turnos/config#servicios", "Servicio eliminado.");
  },

  async guardarBarbero(req, res) {
    const r = await turnos.guardarBarbero(req.params.id || null, req.body);
    volver(req, res, "/admin/turnos/config#equipo", r.ok ? "Profesional guardado." : r.mensaje);
  },

  async borrarBarbero(req, res) {
    const r = await turnos.borrarBarbero(req.params.id);
    volver(req, res, "/admin/turnos/config#equipo", r.ok ? "Profesional eliminado." : r.mensaje);
  },

  async guardarHorarios(req, res) {
    const r = await turnos.guardarHorarios(req.body);
    volver(req, res, "/admin/turnos/config#horarios", r.ok ? "Horarios guardados." : r.mensaje);
  },

  async crearBloqueo(req, res) {
    const r = await turnos.crearBloqueo(req.body);
    volver(req, res, "/admin/turnos/config#cierres", r.ok ? "Día cerrado." : r.mensaje);
  },

  async borrarBloqueo(req, res) {
    await turnos.borrarBloqueo(req.params.id);
    volver(req, res, "/admin/turnos/config#cierres", "Día reabierto.");
  },
};
