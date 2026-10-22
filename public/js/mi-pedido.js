document.querySelectorAll("[data-copiar]").forEach((b) =>
  b.addEventListener("click", async () => {
    const valor = b.parentElement.querySelector("[data-copiar-valor]")?.dataset.copiarValor;
    try { await navigator.clipboard.writeText(valor); window.BB.toast("Copiado ✓"); } catch { window.BB.toast("No se pudo copiar", "error"); }
  })
);
