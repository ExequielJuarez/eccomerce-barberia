(() => {
  const { $, $$, toast, pedir, contadorCarrito } = window.BB;
  const raiz = $("[data-producto]");
  if (!raiz) return;

  const principal = $("#galeriaPrincipal");
  const foto = $("#fotoPrincipal");
  $$(".galeria__mini button").forEach((b) => b.addEventListener("click", () => {
    foto.src = b.dataset.foto;
    $$(".galeria__mini button").forEach((x) => x.classList.toggle("activa", x === b));
  }));
  if (matchMedia("(hover: hover) and (min-width: 901px)").matches) {
    principal.addEventListener("mouseenter", () => principal.classList.add("zoom"));
    principal.addEventListener("mouseleave", () => principal.classList.remove("zoom"));
    principal.addEventListener("mousemove", (e) => {
      const r = principal.getBoundingClientRect();
      principal.style.setProperty("--zx", ((e.clientX - r.left) / r.width) * 100 + "%");
      principal.style.setProperty("--zy", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  }

  $$('input[name="color"]').forEach((i) => i.addEventListener("change", () => { $("#colorElegido").textContent = i.value; }));

  const cant = $("#cantidad");
  const tope = Number(cant.max) || 1;
  const fijar = (n) => (cant.value = Math.min(Math.max(1, n || 1), tope));
  $("[data-menos]").addEventListener("click", () => fijar(Number(cant.value) - 1));
  $("[data-mas]").addEventListener("click", () => fijar(Number(cant.value) + 1));
  cant.addEventListener("change", () => fijar(Number(cant.value)));

  const form = $("#formCompra");
  const boton = $("#btnAgregar");
  let enCurso = false;
  async function agregar(e) {
    e?.preventDefault();
    if (enCurso || raiz.dataset.stock === "0") return;
    enCurso = true;
    boton.classList.add("is-cargando");
    const r = await pedir("/carrito/agregar", {
      metodo: "POST",
      datos: { id: raiz.dataset.id, cantidad: Number(cant.value), color: form.querySelector('input[name="color"]:checked')?.value },
    });
    enCurso = false;
    boton.classList.remove("is-cargando");
    if (!r.ok) return toast(r.mensaje || "No se pudo agregar", "error");
    contadorCarrito(r.cantidad);
    toast("Agregado al carrito ✓");
    const span = boton.querySelector("span");
    span.textContent = "Agregado ✓";
    setTimeout(() => (span.textContent = "Agregar al carrito"), 1800);
  }
  form.addEventListener("submit", agregar);
  $("#barraAgregar")?.addEventListener("click", agregar);

  const barra = $("#barraCompra");
  if (barra && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => {
      const visible = !en.isIntersecting && en.boundingClientRect.top < 0;
      barra.classList.toggle("visible", visible);
      barra.setAttribute("aria-hidden", String(!visible));
    }).observe(boton);
  }
})();
