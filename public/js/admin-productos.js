(() => {
  const { $, $$, pedir, toast, esc } = window.ADM;
  const tabla = $("#tablaProductos");
  if (!tabla) return;
  const BAJO = window.STOCK_BAJO ?? 5;

  const pintarFila = (fila, stock) => {
    fila.querySelector("[data-stock-input]").value = stock;
    const est = fila.querySelector("[data-stock-estado]");
    est.className = `estado stock-estado ${stock === 0 ? "estado--cancelado" : stock <= BAJO ? "estado--alerta" : "estado--ok"}`;
    est.textContent = stock === 0 ? "Sin stock" : stock <= BAJO ? "Bajo" : "OK";
  };
  async function enviar(fila, datos) {
    const r = await pedir(`/admin/productos/${fila.dataset.id}/stock`, { metodo: "PATCH", datos });
    if (!r.ok) return toast(r.mensaje || "No se pudo actualizar", "error");
    pintarFila(fila, r.stock);
    const x = r.resumen;
    $$("[data-resumen]").forEach((el) => {
      const k = el.dataset.resumen;
      el.textContent = k === "unidades" ? x.unidades : k === "bajo" ? x.bajo.length : k === "sin" ? x.sinStock.length : window.ADM.peso(x.valorVenta);
    });
  }
  tabla.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cambio]");
    if (b) enviar(b.closest("tr"), { cambio: Number(b.dataset.cambio) });
  });
  tabla.addEventListener("change", (e) => {
    if (e.target.matches("[data-stock-input]")) enviar(e.target.closest("tr"), { valor: Number(e.target.value) });
  });

  // Búsqueda y filtros en vivo: la tabla se actualiza sola mientras escribís (sin apretar Enter).
  const form = $("#filtrosProductos");
  if (form) {
    let espera, anterior;
    async function buscar() {
      const params = new URLSearchParams(new FormData(form));
      [...params].forEach(([k, v]) => { if (!v) params.delete(k); });
      const url = location.pathname + (params.toString() ? "?" + params : "");
      anterior?.abort();
      anterior = new AbortController();
      try {
        const html = await (await fetch(url, { headers: { Accept: "text/html" }, signal: anterior.signal })).text();
        const nuevo = new DOMParser().parseFromString(html, "text/html").querySelector("#tablaProductos tbody");
        if (!nuevo) return;
        tabla.querySelector("tbody").innerHTML = nuevo.innerHTML;
        const total = $("#totalLista");
        if (total) total.textContent = nuevo.querySelectorAll("tr[data-id]").length;
        history.replaceState(null, "", url);
      } catch { /* una búsqueda más nueva reemplaza a esta */ }
    }
    form.addEventListener("input", (e) => {
      if (!e.target.matches('input[type="search"]')) return;
      clearTimeout(espera);
      espera = setTimeout(buscar, 200);
    });
    form.addEventListener("change", (e) => { e.stopPropagation(); buscar(); });
    form.addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(espera); buscar(); });
  }
})();
