(() => {
  const { $, $$, peso, toast, pedir, contadorCarrito } = window.BB;
  const raiz = $("[data-carrito]");
  if (!raiz || !$("#items")) return;

  const fijar = (sel, txt) => $$(sel).forEach((e) => (e.textContent = txt));

  function pintar(r) {
    contadorCarrito(r.cantidad);
    fijar('[data-r="cantidad"]', r.cantidad);
    fijar('[data-r="subtotal"]', peso(r.subtotal));
    fijar('[data-r="descuentoCupon"]', peso(r.descuentoCupon));
    fijar('[data-r="envio"]', r.envio === null ? "A calcular" : r.envio === 0 ? "Gratis" : peso(r.envio));
    fijar('[data-r="total"]', peso(r.total));
    $("#filaCupon").hidden = !r.descuentoCupon;
    $("#envioProgreso").style.width = r.progresoEnvio + "%";
    $("#envioTexto").innerHTML = r.envioGratis
      ? "🎉 <strong>¡Tenés envío gratis!</strong>"
      : `Te faltan <strong>${peso(r.faltaEnvioGratis)}</strong> para el <strong>envío gratis</strong>`;
    $("#formCp").hidden = r.entrega === "retiro" || r.envioGratis;
    $("#formCupon").hidden = !!r.cupon;
    $("#cuponActivo").hidden = !r.cupon;
    if (r.cupon) { $("#cuponCodigo").textContent = r.cupon.codigo; $("#cuponDesc").textContent = r.cupon.descripcion; }
    r.items.forEach((i) => {
      const fila = $(`.item[data-clave="${CSS.escape(i.clave)}"]`);
      if (!fila) return;
      fila.querySelector("input").value = i.cantidad;
      fila.querySelector("[data-subtotal]").textContent = peso(i.subtotal);
    });

    const claves = new Set(r.items.map((i) => i.clave));
    $$(".item").forEach((f) => { if (!claves.has(f.dataset.clave)) f.remove(); });
    if (!r.items.length) location.reload();
  }

  async function accion(url, metodo, datos) {
    const r = await pedir(url, { metodo, datos });
    if (!r.ok) { toast(r.mensaje || "No se pudo actualizar", "error"); return null; }
    pintar(r.resumen);
    return r;
  }

  $("#items").addEventListener("click", (e) => {
    const fila = e.target.closest(".item");
    if (!fila) return;
    const input = fila.querySelector("input");
    const clave = encodeURIComponent(fila.dataset.clave);
    if (e.target.closest("[data-mas]")) accion(`/carrito/item/${clave}`, "PATCH", { cantidad: Number(input.value) + 1 });
    if (e.target.closest("[data-menos]") && Number(input.value) > 1) accion(`/carrito/item/${clave}`, "PATCH", { cantidad: Number(input.value) - 1 });
    if (e.target.closest("[data-quitar]")) accion(`/carrito/item/${clave}`, "DELETE");
  });
  $("#items").addEventListener("change", (e) => {
    const fila = e.target.closest(".item");
    if (fila && e.target.matches("input")) accion(`/carrito/item/${encodeURIComponent(fila.dataset.clave)}`, "PATCH", { cantidad: Number(e.target.value) });
  });
  $("#vaciarCarrito").addEventListener("click", () => { if (confirm("¿Vaciar el carrito?")) accion("/carrito", "DELETE"); });

  $$('input[name="entrega"]').forEach((i) => i.addEventListener("change", () => accion("/carrito/entrega", "POST", { entrega: i.value })));
  $("#formCp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await accion("/carrito/envio", "POST", { codigoPostal: $("#cp").value.trim() });
    if (r) toast("Envío calculado");
  });

  $("#formCupon").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#errorCupon");
    err.hidden = true;
    const r = await pedir("/carrito/cupon", { metodo: "POST", datos: { codigo: $("#codigoCupon").value } });
    if (!r.ok) { err.textContent = r.mensaje || "Cupón inválido"; err.hidden = false; return; }
    $("#codigoCupon").value = "";
    pintar(r.resumen);
    toast("Cupón aplicado ✓");
  });
  $("#quitarCupon").addEventListener("click", () => accion("/carrito/cupon", "DELETE"));
})();
