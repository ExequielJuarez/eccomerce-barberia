(() => {
  const { $, $$, peso } = window.BB;
  const raiz = $("[data-catalogo]");
  if (!raiz) return;

  const tarjetas = $$("#grilla .tarjeta");
  const grilla = $("#grilla");
  const vacio = $("#vacio");
  const panel = $("#panelFiltros");
  const fondo = $("#panelFondo");
  const abrirBtn = $("#abrirFiltros");
  const estado = { grupo: $(".filtro-chip.activo")?.dataset.grupo || "", colores: new Set(), min: null, max: null, stock: false, orden: "novedad" };
  const original = tarjetas.map((t, i) => ({ t, i }));

  const abrir = () => { panel.classList.add("abierto"); panel.setAttribute("aria-hidden", "false"); fondo.hidden = false; abrirBtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; };
  const cerrar = () => { panel.classList.remove("abierto"); panel.setAttribute("aria-hidden", "true"); fondo.hidden = true; abrirBtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; };
  abrirBtn?.addEventListener("click", abrir);
  fondo?.addEventListener("click", cerrar);
  $("#cerrarFiltros")?.addEventListener("click", cerrar);
  $("#aplicarFiltros")?.addEventListener("click", cerrar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });

  const cumple = (t) => {
    if (estado.grupo && t.dataset.grupo !== estado.grupo) return false;
    if (estado.colores.size && !t.dataset.colores.split(",").some((x) => estado.colores.has(x))) return false;
    const precio = Number(t.dataset.precio);
    if (estado.min != null && precio < estado.min) return false;
    if (estado.max != null && precio > estado.max) return false;
    if (estado.stock && t.dataset.stock !== "1") return false;
    return true;
  };

  function aplicar() {
    if (!grilla) return;
    let visibles = 0;
    tarjetas.forEach((t) => { const ok = cumple(t); t.hidden = !ok; if (ok) visibles++; });

    const por = {
      novedad: (a, b) => b.t.dataset.id - a.t.dataset.id,
      "precio-asc": (a, b) => a.t.dataset.precio - b.t.dataset.precio,
      "precio-desc": (a, b) => b.t.dataset.precio - a.t.dataset.precio,
      nombre: (a, b) => a.t.querySelector(".tarjeta__nombre").textContent.localeCompare(b.t.querySelector(".tarjeta__nombre").textContent, "es"),
    }[estado.orden];
    [...original].sort(por).forEach(({ t }) => grilla.appendChild(t));
    $("#catCantidad").textContent = visibles;
    $("#resultadosPanel").textContent = visibles;
    vacio.hidden = visibles > 0;
    const activos = estado.colores.size + (estado.min != null) + (estado.max != null) + estado.stock;
    const c = $("#filtrosActivos");
    c.hidden = !activos;
    c.textContent = activos;
    window.BB.aparecer(grilla);

    const url = new URL(location.href);
    const campo = raiz.dataset.grupoCampo === "sub" ? "sub" : null;
    if (campo) { estado.grupo ? url.searchParams.set("sub", estado.grupo) : url.searchParams.delete("sub"); history.replaceState(null, "", url); }
  }

  $$(".filtro-chip").forEach((b) => b.addEventListener("click", () => {
    $$(".filtro-chip").forEach((x) => x.classList.toggle("activo", x === b));
    estado.grupo = b.dataset.grupo;
    aplicar();
  }));
  $$('input[name="color"]').forEach((i) => i.addEventListener("change", () => { i.checked ? estado.colores.add(i.value) : estado.colores.delete(i.value); aplicar(); }));
  const numero = (el) => (el.value === "" ? null : Math.max(0, Number(el.value)));
  $("#precioMin")?.addEventListener("input", (e) => { estado.min = numero(e.target); aplicar(); });
  $("#precioMax")?.addEventListener("input", (e) => { estado.max = numero(e.target); aplicar(); });
  $("#soloStock")?.addEventListener("change", (e) => { estado.stock = e.target.checked; aplicar(); });
  $("#orden")?.addEventListener("change", (e) => { estado.orden = e.target.value; aplicar(); });

  function limpiar() {
    estado.colores.clear(); estado.min = estado.max = null; estado.stock = false; estado.grupo = "";
    $$('input[name="color"], #soloStock').forEach((i) => (i.checked = false));
    $("#precioMin").value = $("#precioMax").value = "";
    $$(".filtro-chip").forEach((x) => x.classList.toggle("activo", x.dataset.grupo === ""));
    aplicar();
  }
  $("#limpiarPanel")?.addEventListener("click", limpiar);
  $("#limpiarFiltros")?.addEventListener("click", limpiar);

  if (estado.grupo) aplicar();
})();
