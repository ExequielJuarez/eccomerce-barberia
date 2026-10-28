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
  const base = $("#notif").dataset.base || "/admin/notificaciones";
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
    const r = await pedir(base);
    if (r.ok) { items = r.notificaciones; pintar(r.noLeidas); }
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; btn.setAttribute("aria-expanded", String(!panel.hidden)); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !$("#notif").contains(e.target)) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
  lista.addEventListener("click", async (e) => {
    const li = e.target.closest("[data-id]");
    if (!li) return;
    await pedir(base + "/leidas", { metodo: "POST", datos: { id: li.dataset.id } });
    if (li.dataset.url) location.href = li.dataset.url; else cargar();
  });
  $("#notifLeerTodas").addEventListener("click", async () => { await pedir(base + "/leidas", { metodo: "POST", datos: {} }); cargar(); });
  cargar();

  // Sonido de aviso: el navegador solo lo permite después de que el admin toca la página una vez.
  let audio = null;
  const desbloquear = () => {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch { audio = null; }
  };
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, desbloquear, { passive: true }));
  // Mientras el navegador no deje sonar, se ve un botón fijo para activarlo con un toque.
  const btnSonido = document.createElement("button");
  btnSonido.type = "button";
  btnSonido.className = "adm-sonido";
  btnSonido.textContent = "🔔 Activar sonido de pedidos";
  document.body.appendChild(btnSonido);
  const revisarSonido = () => { btnSonido.hidden = Boolean(audio && audio.state === "running"); };
  btnSonido.addEventListener("click", () => { desbloquear(); setTimeout(revisarSonido, 150); });
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, () => setTimeout(revisarSonido, 150), { passive: true }));
  const tituloOriginal = document.title;
  let parpadeo = null;
  const avisarEnTitulo = (texto) => {
    if (!document.hidden) return;
    clearInterval(parpadeo);
    let on = false;
    parpadeo = setInterval(() => { document.title = (on = !on) ? "🔔 " + texto : tituloOriginal; }, 1000);
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { clearInterval(parpadeo); document.title = tituloOriginal; } });
  let ultimoSonido = 0;
  const sonar = () => {
    if (Date.now() - ultimoSonido < 1500) return true;
    ultimoSonido = Date.now();
    if (!audio || audio.state !== "running") return false;
    [[880, 0], [1175, 0.18], [1568, 0.36]].forEach(([hz, t]) => {
      const osc = audio.createOscillator(), gan = audio.createGain();
      const ini = audio.currentTime + t;
      osc.type = "sine";
      osc.frequency.value = hz;
      gan.gain.setValueAtTime(0.0001, ini);
      gan.gain.exponentialRampToValueAtTime(0.35, ini + 0.02);
      gan.gain.exponentialRampToValueAtTime(0.0001, ini + 0.4);
      osc.connect(gan).connect(audio.destination);
      osc.start(ini);
      osc.stop(ini + 0.42);
    });
    return true;
  };

  if ("EventSource" in window) {
    const es = new EventSource(base + "/stream");
    es.addEventListener("notificacion", (e) => {
      const n = JSON.parse(e.data);
      const sono = sonar();
      avisarEnTitulo(n.titulo);
      toast(n.titulo + (n.mensaje ? " · " + n.mensaje : "") + (sono ? "" : " · activá el sonido con el botón dorado"));
      cargar();
      document.dispatchEvent(new CustomEvent("adm:notificacion", { detail: n }));
    });
    es.addEventListener("leidas", cargar);
    window.addEventListener("beforeunload", () => es.close());
  }
})();
