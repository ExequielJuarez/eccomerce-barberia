(() => {
  const { $, $$ } = window.BB;
  const form = $("#formDatos");
  if (!form) return;

  form.addEventListener("input", (e) => e.target.closest(".campo--error")?.classList.remove("campo--error"));

  form.addEventListener("submit", (e) => {
    $$(".campo--error", form).forEach((c) => c.classList.remove("campo--error"));
    const vacios = ["nombre", "apellido", "telefono"].filter((n) => !form[n].value.trim());
    if (vacios.length) {
      e.preventDefault();
      vacios.forEach((n) => form[n].closest(".campo").classList.add("campo--error"));
      form[vacios[0]].focus();
      window.BB.toast("Completá los campos marcados", "error");
      return;
    }
    const boton = form.querySelector("button[type=submit]");
    if (boton) { boton.disabled = true; boton.textContent = "Enviando pedido…"; }
  });
})();
