(() => {
  const { $, $$, pedir, toast } = window.ADM;
  const lista = $("#pedidosLista");
  if (!lista) return;
  const TEXTO = { pendiente: "Nuevo", vendido: "Vendido", cancelado: "Cancelado" };

  // Vuelve a pedir la página y cambia solo la lista y los contadores, respetando los detalles abiertos.
  let actualizando = false;
  async function refrescar() {
    if (actualizando) return;
    actualizando = true;
    try {
      const html = await (await fetch(location.href, { headers: { Accept: "text/html" } })).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const nueva = doc.querySelector("#pedidosLista");
      if (!nueva) return;
      const abiertos = new Set($$(".pedido__cuerpo:not([hidden])", lista).map((c) => c.closest(".pedido").dataset.numero));
      lista.innerHTML = nueva.innerHTML;
      abiertos.forEach((n) => {
        const art = lista.querySelector(`.pedido[data-numero="${n}"]`);
        if (!art) return;
        art.querySelector(".pedido__cuerpo").hidden = false;
        const b = art.querySelector("[data-abrir]");
        b.setAttribute("aria-expanded", "true");
        b.textContent = "Cerrar";
      });
      $(".vacio-panel")?.closest(".panel")?.remove();
      const chips = $(".adm-rango"), nuevos = doc.querySelector(".adm-rango");
      if (chips && nuevos) chips.innerHTML = nuevos.innerHTML;
    } catch { /* si falla, queda la notificación */ } finally { actualizando = false; }
  }

  lista.addEventListener("click", async (e) => {
    const abrir = e.target.closest("[data-abrir]");
    if (abrir) {
      const cuerpo = abrir.closest(".pedido").querySelector(".pedido__cuerpo");
      cuerpo.hidden = !cuerpo.hidden;
      abrir.setAttribute("aria-expanded", String(!cuerpo.hidden));
      abrir.textContent = cuerpo.hidden ? "Detalle" : "Cerrar";
      return;
    }

    const marcar = e.target.closest("[data-marcar]");
    if (!marcar) return;
    const art = marcar.closest(".pedido");
    const estado = marcar.dataset.marcar;
    if (estado === "cancelado" && !confirm(`¿Cancelar el pedido #${art.dataset.numero}? Sale de la lista y los productos vuelven al stock.`)) return;

    marcar.disabled = true;
    const r = await pedir(`/admin/pedidos/${art.dataset.numero}/estado`, { metodo: "PATCH", datos: { estado } });
    if (!r.ok) {
      marcar.disabled = false;
      toast(r.mensaje || "No se pudo cambiar el estado", "error");
      return;
    }
    toast(`Pedido #${art.dataset.numero}: ${TEXTO[r.estado] || r.estado}` + (r.stockMovido ? (r.stockMovido > 0 ? ` · volvieron ${r.stockMovido} u. al stock` : ` · se descontaron ${-r.stockMovido} u.`) : ""));
    await refrescar();
  });

  // Pedido nuevo: la lista se actualiza sola.
  document.addEventListener("adm:notificacion", (e) => { if (e.detail.tipo === "pedido") refrescar(); });

  if (lista.children.length === 1) lista.querySelector("[data-abrir]")?.click();
})();
