const notificaciones = require("../services/notificacionService");

// Las notificaciones sin destinatario son del panel de administración; las de un peluquero llevan su usuarioId.
function crearControlador(destinatario) {
  return {
    async listar(req, res) {
      res.json({ ok: true, ...(await notificaciones.listar(15, destinatario(req))) });
    },

    async marcarLeidas(req, res) {
      const id = req.body?.id ? Number(req.body.id) : null;
      res.json({ ok: true, noLeidas: await notificaciones.marcarLeidas(id, destinatario(req)) });
    },

    async stream(req, res) {
      const usuarioId = destinatario(req);
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();

      const enviar = (evento, datos) => res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
      enviar("hola", { noLeidas: await notificaciones.noLeidas(usuarioId) });

      const alCrear = (n) => n.usuarioId === usuarioId && enviar("notificacion", n);
      const alLeer = (d) => d.usuarioId === usuarioId && enviar("leidas", d);
      notificaciones.eventos.on("nueva", alCrear);
      notificaciones.eventos.on("leidas", alLeer);

      const latido = setInterval(() => res.write(": latido\n\n"), 25000);

      req.on("close", () => {
        clearInterval(latido);
        notificaciones.eventos.off("nueva", alCrear);
        notificaciones.eventos.off("leidas", alLeer);
      });
    },
  };
}

module.exports = crearControlador(() => null);
module.exports.paraUsuario = () => crearControlador((req) => req.session.usuarioLogueado.id);
