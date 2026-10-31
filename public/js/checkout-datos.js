(() => {
  const { $, $$ } = window.BB;
  const form = $("#formDatos");
  if (!form) return;

  form.addEventListener("input", (e) => e.target.closest(".campo--error")?.classList.remove("campo--error"));

  form.addEventListener("submit", async (e) => {
    $$(".campo--error", form).forEach((c) => c.classList.remove("campo--error"));
    const vacios = ["nombre", "apellido", "telefono"].filter((n) => !form[n].value.trim());
    if (vacios.length) {
      e.preventDefault();
      vacios.forEach((n) => form[n].closest(".campo").classList.add("campo--error"));
      form[vacios[0]].focus();
      window.BB.toast("Completá los campos marcados", "error");
      return;
    }

    // Se guarda el pedido por fetch y después se abre el WhatsApp de la tienda con el carrito ya escrito.
    e.preventDefault();
    const boton = form.querySelector("button[type=submit]");
    const texto = boton?.innerHTML;
    if (boton) { boton.disabled = true; boton.textContent = "Abriendo WhatsApp…"; }
    try {
      const r = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(new FormData(form)),
      });
      const json = await r.json().catch(() => ({}));
      if (json.url) { window.location.href = json.url; return; }
      // Datos inválidos: se envía el formulario normal para ver los errores del servidor.
      form.submit();
    } catch {
      if (boton) { boton.disabled = false; boton.innerHTML = texto; }
      window.BB.toast("No hay conexión. Probá de nuevo.", "error");
    }
  });
})();
