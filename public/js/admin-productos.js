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
})();
