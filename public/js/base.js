(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const peso = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  let tTimer;
  function toast(mensaje, tipo) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = mensaje;
    el.classList.toggle("toast--error", tipo === "error");
    el.classList.add("visible");
    clearTimeout(tTimer);
    tTimer = setTimeout(() => el.classList.remove("visible"), 3200);
  }

  async function pedir(url, { metodo = "GET", datos } = {}) {
    try {
      const r = await fetch(url, {
        method: metodo,
        headers: { Accept: "application/json", ...(datos ? { "Content-Type": "application/json" } : {}) },
        body: datos ? JSON.stringify(datos) : undefined,
      });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok && json.ok !== false, status: r.status, ...json };
    } catch {
      return { ok: false, mensaje: "No hay conexión. Probá de nuevo." };
    }
  }
  function contadorCarrito(n) {
    const el = $("#contadorCarrito");
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
    el.animate([{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" });
    barraCarrito(n);
  }
  // Barra fija de abajo: queda visible mientras haya productos en el carrito.
  function barraCarrito(n) {
    const barra = $("#barraCarrito");
    if (!barra) return;
    barra.hidden = !n;
    $("#barraCarritoN").textContent = n;
    document.body.classList.toggle("con-barra-carrito", Boolean(n));
    if (!n) cerrarMini();
    else if (mini && !mini.hidden) pintarMini();
  }

  // Mini carrito: deja ver (y ajustar) lo que se va agregando sin salir de la página.
  const mini = $("#miniCarrito");
  const miniLista = $("#miniLista");
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; };
  async function pintarMini() {
    const r = await pedir("/carrito/resumen");
    if (!r.ok) return;
    miniLista.replaceChildren(...r.items.map((i) => {
      const li = el("li", "mini-item"); li.dataset.clave = i.clave;
      const foto = el("span", "mini-item__foto");
      if (i.imagen) { const img = document.createElement("img"); img.src = i.imagen; img.alt = ""; foto.append(img); }
      const datos = el("span", "mini-item__datos");
      datos.append(el("strong", "", i.nombre));
      if (i.color) datos.append(el("small", "", i.color));
      const cant = el("span", "mini-item__cant");
      const menos = el("button", "", "−"); menos.type = "button"; menos.dataset.menos = ""; menos.setAttribute("aria-label", "Menos"); menos.disabled = i.cantidad <= 1;
      const mas = el("button", "", "+"); mas.type = "button"; mas.dataset.mas = ""; mas.setAttribute("aria-label", "Más");
      cant.append(menos, el("b", "", String(i.cantidad)), mas);
      datos.append(cant);
      const der = el("span", "mini-item__der");
      der.append(el("strong", "", peso(i.subtotal)));
      const quitar = el("button", "mini-item__quitar", "Quitar"); quitar.type = "button"; quitar.dataset.quitar = "";
      der.append(quitar);
      li.append(foto, datos, der);
      return li;
    }));
    $("#miniTotal").textContent = peso(r.total);
  }
  function abrirMini() { if (!mini) return; mini.hidden = false; document.body.classList.add("mini-abierto"); pintarMini(); }
  function cerrarMini() { if (!mini) return; mini.hidden = true; document.body.classList.remove("mini-abierto"); }
  $("#abrirMini")?.addEventListener("click", abrirMini);
  $$("[data-cerrar-mini]").forEach((e) => e.addEventListener("click", cerrarMini));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMini(); });
  miniLista?.addEventListener("click", async (e) => {
    const li = e.target.closest(".mini-item");
    if (!li) return;
    const clave = encodeURIComponent(li.dataset.clave);
    const actual = Number(li.querySelector("b").textContent);
    let r;
    if (e.target.closest("[data-quitar]")) r = await pedir(`/carrito/item/${clave}`, { metodo: "DELETE" });
    else if (e.target.closest("[data-mas]")) r = await pedir(`/carrito/item/${clave}`, { metodo: "PATCH", datos: { cantidad: actual + 1 } });
    else if (e.target.closest("[data-menos]") && actual > 1) r = await pedir(`/carrito/item/${clave}`, { metodo: "PATCH", datos: { cantidad: actual - 1 } });
    else return;
    if (!r.ok) return toast(r.mensaje || "No se pudo actualizar", "error");
    contadorCarrito(r.cantidad);
  });
  window.BB = { $, $$, peso, toast, pedir, contadorCarrito };
  barraCarrito(Number($("#barraCarritoN")?.textContent) || 0);

  const flash = $("#flash");
  if (flash) toast(flash.dataset.mensaje);

  const btnMenu = $("#btnMenu");
  const cerrarMenu = () => { document.body.classList.remove("drawer-abierto"); btnMenu?.setAttribute("aria-expanded", "false"); };
  btnMenu?.addEventListener("click", () => {
    const abierto = document.body.classList.toggle("drawer-abierto");
    btnMenu.setAttribute("aria-expanded", String(abierto));
  });
  $$("#drawer a").forEach((a) => a.addEventListener("click", cerrarMenu));
  $("#btnCerrarMenu")?.addEventListener("click", cerrarMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMenu(); });

  const busqueda = $("#busqueda");
  const input = $("#busquedaInput");
  const lista = $("#sugerencias");
  const atajos = $("#busquedaAtajos");
  const btnBuscar = $("#btnBuscar");
  const abrirBusqueda = () => {
    busqueda.classList.add("abierto");
    busqueda.setAttribute("aria-hidden", "false");
    btnBuscar.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    setTimeout(() => input.focus(), 120);
  };
  const cerrarBusqueda = () => {
    busqueda.classList.remove("abierto");
    busqueda.setAttribute("aria-hidden", "true");
    btnBuscar.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };
  btnBuscar?.addEventListener("click", abrirBusqueda);
  $("#btnCerrarBusqueda")?.addEventListener("click", cerrarBusqueda);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { cerrarBusqueda(); cerrarMenu(); }
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && btnBuscar) { e.preventDefault(); abrirBusqueda(); }
  });
  let tBusq, abortar;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  input?.addEventListener("input", () => {
    clearTimeout(tBusq);
    const q = input.value.trim();
    if (q.length < 2) { lista.innerHTML = ""; atajos.hidden = false; return; }
    atajos.hidden = true;
    tBusq = setTimeout(async () => {
      abortar?.abort();
      abortar = new AbortController();
      try {
        const r = await fetch(`/buscar/sugerencias?q=${encodeURIComponent(q)}`, { signal: abortar.signal }).then((x) => x.json());
        lista.innerHTML = r.productos.length
          ? r.productos.map((p) => `
              <a class="sugerencia" href="/producto/${p.id}">
                <img src="${esc(p.imagen || "")}" alt="">
                <span><span class="sugerencia__nombre">${esc(p.nombre)}</span><br><span class="sugerencia__cat">${esc(p.categoria)}${p.sinStock ? " · Agotado" : ""}</span></span>
                <span class="sugerencia__precio">${peso(p.precio)}</span>
              </a>`).join("") + (r.total > r.productos.length ? `<a class="enlace enlace--inicio enlace--separado" href="/buscar?q=${encodeURIComponent(q)}">Ver los ${r.total} resultados</a>` : "")
          : `<p class="sugerencias__vacio">No encontramos “${esc(q)}”. Probá con otra palabra.</p>`;
      } catch {}
    }, 180);
  });

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-fav]");
    if (!btn) return;
    e.preventDefault();
    const r = await pedir(`/favoritos/${btn.dataset.fav}`, { metodo: "POST" });
    if (!r.ok) return toast(r.mensaje || "No se pudo guardar", "error");
    btn.setAttribute("aria-pressed", String(r.activo));
    const c = $("#contadorFavoritos");
    if (c) { c.textContent = r.cantidad; c.hidden = !r.cantidad; }
    toast(r.activo ? "Guardado en favoritos" : "Quitado de favoritos");
    document.dispatchEvent(new CustomEvent("bb:favorito", { detail: { id: btn.dataset.fav, ...r } }));
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver-clave]");
    if (!b) return;
    const input = b.parentElement.querySelector("input");
    const ver = input.type === "password";
    input.type = ver ? "text" : "password";
    b.textContent = ver ? "Ocultar" : "Ver";
    b.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
  });

  const cookies = $("#avisoCookies");
  try {
    if (cookies && !localStorage.getItem("bb-cookies")) cookies.hidden = false;
    $("#aceptarCookies")?.addEventListener("click", () => { localStorage.setItem("bb-cookies", "1"); cookies.hidden = true; });
  } catch {}

  const aparecer = (raiz = document) => {
    const nodos = $$(".rev:not(.visto)", raiz);
    if (!("IntersectionObserver" in window)) return nodos.forEach((n) => n.classList.add("visto"));
    const o = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("visto"); o.unobserve(x.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    nodos.forEach((n) => o.observe(n));
  };
  window.BB.aparecer = aparecer;
  aparecer();
})();
