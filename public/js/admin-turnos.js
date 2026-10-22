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
  const refrescar = async (avisar) => {
    try {
      const html = await fetch(location.href, { headers: { Accept: "text/html" } }).then((r) => r.text());
      const doc = new DOMParser().parseFromString(html, "text/html");
      const nuevo = doc.querySelector("[data-agenda-viva]");
      const actual = $("[data-agenda-viva]");
      if (nuevo && actual) actual.innerHTML = nuevo.innerHTML;
      const menuNuevo = doc.querySelector(".adm-nav");
      const menu = $(".adm-nav");
      if (menuNuevo && menu) menu.innerHTML = menuNuevo.innerHTML;
      if (avisar) toast("Se actualizó la agenda");
    } catch {}
  };

  const es = new EventSource("/admin/turnos/eventos");
  es.addEventListener("cambio", () => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => refrescar(true), 250);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refrescar(false);
  });
})();
