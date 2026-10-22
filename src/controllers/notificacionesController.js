const notificaciones = require("../services/notificacionService");

module.exports = {

  async listar(req, res) {
    res.json({ ok: true, ...(await notificaciones.listar()) });
  },

  async marcarLeidas(req, res) {
    const id = req.body?.id ? Number(req.body.id) : null;
    res.json({ ok: true, noLeidas: await notificaciones.marcarLeidas(id) });
  },

  async stream(req, res) {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const enviar = (evento, datos) => res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
    enviar("hola", { noLeidas: await notificaciones.noLeidas() });

    const alCrear = (n) => enviar("notificacion", n);
    const alLeer = (d) => enviar("leidas", d);
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
