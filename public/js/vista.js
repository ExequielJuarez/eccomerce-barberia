(() => {
  const aplicar = (raiz = document) => {
    raiz.querySelectorAll("[data-bg]").forEach((e) => (e.style.background = e.dataset.bg));
    raiz.querySelectorAll("[data-w]").forEach((e) => (e.style.width = `${e.dataset.w}%`));
    raiz.querySelectorAll("[data-h]").forEach((e) => (e.style.height = `${e.dataset.h}%`));
    raiz.querySelectorAll("[data-b]").forEach((e) => (e.style.bottom = `${e.dataset.b}%`));
    raiz.querySelectorAll("[data-n]").forEach((e) => e.style.setProperty("--n", e.dataset.n));
    raiz.querySelectorAll("[data-i]").forEach((e) => e.style.setProperty("--i", e.dataset.i));
    raiz.querySelectorAll("[data-d]").forEach((e) => e.style.setProperty("--d", `${e.dataset.d}s`));
  };

  window.aplicarVista = aplicar;
  document.addEventListener("DOMContentLoaded", () => aplicar());

  document.addEventListener("submit", (e) => {
    const confirmable = e.target.closest("[data-confirmar]");
    if (confirmable && !confirm(confirmable.dataset.confirmar)) e.preventDefault();
  });

  document.addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-confirmar], a[data-confirmar]");
    if (boton && !boton.closest("form[data-confirmar]") && !confirm(boton.dataset.confirmar)) e.preventDefault();
    if (e.target.closest("[data-imprimir]")) window.print();
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-auto-enviar]") && e.target.form) e.target.form.submit();
  });
})();
