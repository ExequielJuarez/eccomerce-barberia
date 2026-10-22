(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let tT;
  function toast(mensaje, tipo) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = mensaje;
    el.classList.toggle("toast--error", tipo === "error");
    el.classList.add("visible");
    clearTimeout(tT);
    tT = setTimeout(() => el.classList.remove("visible"), 3400);
  }
  async function pedir(url, { metodo = "GET", datos } = {}) {
    try {
      const r = await fetch(url, { method: metodo, headers: { Accept: "application/json", ...(datos ? { "Content-Type": "application/json" } : {}) }, body: datos ? JSON.stringify(datos) : undefined });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok && json.ok !== false, status: r.status, ...json };
    } catch {
      return { ok: false, mensaje: "No hay conexión. Probá de nuevo." };
    }
  }
  const peso = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.ADM = { $, $$, toast, pedir, peso, esc };

  const flash = $("#flash");
  if (flash) toast(flash.dataset.mensaje);
  document.body.classList.add("adm-body");

  const alternar = (abrir) => { document.body.classList.toggle("adm-abierto", abrir); $("#admFondo").hidden = !abrir; };
  $("#admMenuBtn")?.addEventListener("click", () => alternar(true));
  $("#admFondo")?.addEventListener("click", () => alternar(false));

  const btn = $("#notifBtn");
  if (!btn) return;
  const panel = $("#notifPanel"), lista = $("#notifLista"), contador = $("#notifContador");
  let items = [];
  const hace = (f) => {
    const m = Math.round((Date.now() - new Date(f)) / 60000);
    return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
  };
  const pintar = (noLeidas) => {
    contador.textContent = noLeidas;
    contador.hidden = !noLeidas;
    lista.innerHTML = items.length
      ? items.map((n) => `<li class="notif__item ${n.leida ? "" : "nueva"}" data-id="${n.id}" data-url="${esc(n.url || "")}"><strong>${esc(n.titulo)}</strong><span>${esc(n.mensaje || "")}</span><small>${hace(n.fecha)}</small></li>`).join("")
      : '<li class="notif__vacio">Sin notificaciones</li>';
  };
  async function cargar() {
    const r = await pedir("/admin/notificaciones");
    if (r.ok) { items = r.notificaciones; pintar(r.noLeidas); }
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; btn.setAttribute("aria-expanded", String(!panel.hidden)); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !$("#notif").contains(e.target)) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
  lista.addEventListener("click", async (e) => {
    const li = e.target.closest("[data-id]");
    if (!li) return;
    await pedir("/admin/notificaciones/leidas", { metodo: "POST", datos: { id: li.dataset.id } });
    if (li.dataset.url) location.href = li.dataset.url; else cargar();
  });
  $("#notifLeerTodas").addEventListener("click", async () => { await pedir("/admin/notificaciones/leidas", { metodo: "POST", datos: {} }); cargar(); });
  cargar();

  if ("EventSource" in window) {
    const es = new EventSource("/admin/notificaciones/stream");
    es.addEventListener("notificacion", (e) => {
      const n = JSON.parse(e.data);
      toast(n.titulo + (n.mensaje ? " · " + n.mensaje : ""));
      cargar();
    });
    es.addEventListener("leidas", cargar);
    window.addEventListener("beforeunload", () => es.close());
  }
})();
