(() => {
  const { $, $$, pedir, toast } = window.ADM;
  const lista = $("#pedidosLista");
  if (!lista) return;
  const TEXTO = { pendiente: ["alerta", "Pendiente"], pagado: ["curso", "Pago aprobado"], enviado: ["curso", "Enviado"], entregado: ["ok", "Entregado"], cancelado: ["cancelado", "Cancelado"] };

  lista.addEventListener("click", (e) => {
    const b = e.target.closest("[data-abrir]");
    if (!b) return;
    const cuerpo = b.closest(".pedido").querySelector(".pedido__cuerpo");
    cuerpo.hidden = !cuerpo.hidden;
    b.setAttribute("aria-expanded", String(!cuerpo.hidden));
    b.textContent = cuerpo.hidden ? "Detalle" : "Cerrar";
  });
  lista.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-estado]");
    if (!sel) return;
    const art = sel.closest(".pedido");
    const r = await pedir(`/admin/pedidos/${art.dataset.numero}/estado`, { metodo: "PATCH", datos: { estado: sel.value } });
    if (!r.ok) { toast(r.mensaje || "No se pudo cambiar el estado", "error"); location.reload(); return; }
    const [clave, texto] = TEXTO[r.estado] || ["curso", r.estado];
    const est = art.querySelector("[data-situacion]");
    est.className = `estado estado--${clave}`;
    est.textContent = texto;
    toast(`Pedido #${art.dataset.numero}: ${texto}` + (r.stockMovido ? (r.stockMovido > 0 ? ` · volvieron ${r.stockMovido} u. al stock` : ` · se descontaron ${-r.stockMovido} u.`) : ""));
  });

  // Pedido nuevo: se actualiza la lista y los contadores sin recargar, respetando los detalles abiertos.
  let actualizando = false;
  document.addEventListener("adm:notificacion", async (e) => {
    if (e.detail.tipo !== "pedido" || actualizando) return;
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
  });

  if (lista.children.length === 1) lista.querySelector("[data-abrir]")?.click();
})();
