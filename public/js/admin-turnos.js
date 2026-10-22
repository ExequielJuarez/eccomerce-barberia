(() => {
  const { $, $$, toast } = window.ADM;

  $$("[data-copiar]").forEach((boton) => {
    boton.addEventListener("click", async () => {
      const campo = $(boton.dataset.copiar);
      try {
        await navigator.clipboard.writeText(campo.value);
        toast("Link copiado ✓");
      } catch {
        campo.select();
        toast("Seleccionado: copialo con Ctrl+C", "error");
      }
    });
  });
})();
