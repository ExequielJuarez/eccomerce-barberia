(() => {
  const { $, $$, toast } = window.ADM;

  document.addEventListener("click", async (e) => {
    const boton = e.target.closest("[data-copiar]");
    if (!boton) return;
    const campo = $(boton.dataset.copiar);
    try {
      await navigator.clipboard.writeText(campo.value);
      toast("Link copiado ✓");
    } catch {
      campo.select();
      toast("Seleccionado: copialo con Ctrl+C", "error");
    }
  });

  if (!$("[data-agenda-viva]") || !("EventSource" in window)) return;

  let pendiente;
  const cargar = async (url, { avisar = false, historial = false } = {}) => {
    try {
      const html = await fetch(url, { headers: { Accept: "text/html" } }).then((r) => r.text());
      const doc = new DOMParser().parseFromString(html, "text/html");
      const nuevo = doc.querySelector("[data-agenda-viva]");
      const actual = $("[data-agenda-viva]");
      if (!nuevo || !actual) return location.assign(url);
      actual.innerHTML = nuevo.innerHTML;
      const menuNuevo = doc.querySelector(".adm-nav");
      const menu = $(".adm-nav");
      if (menuNuevo && menu) menu.innerHTML = menuNuevo.innerHTML;
      if (historial) history.pushState(null, "", url);
      if (avisar) toast("Se actualizó la agenda");
    } catch {
      location.assign(url);
    }
  };
  const refrescar = (avisar) => cargar(location.href, { avisar });

  document.addEventListener("click", (e) => {
    const enlace = e.target.closest("[data-agenda-viva] a[href^='/admin/turnos?fecha='], [data-agenda-viva] a[href='/admin/turnos']");
    if (!enlace || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    cargar(enlace.href, { historial: true });
  });
  document.addEventListener("change", (e) => {
    if (!e.target.matches("[data-fecha-agenda]") || !e.target.value) return;
    cargar(`/admin/turnos?fecha=${e.target.value}`, { historial: true });
  });
  window.addEventListener("popstate", () => cargar(location.href));

  const es = new EventSource("/admin/turnos/eventos");
  es.addEventListener("cambio", () => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => refrescar(true), 250);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refrescar(false);
  });
})();
