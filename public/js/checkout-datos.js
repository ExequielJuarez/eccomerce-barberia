(() => {
  const { $, $$ } = window.BB;
  const form = $("#formDatos");
  if (!form) return;

  const domicilio = $("#camposDomicilio");
  const factura = $("#camposFactura");
  const sync = () => {
    const retiro = form.entrega.value === "retiro";
    domicilio.hidden = retiro;
    factura.hidden = form.facturacion.value !== "facturaA";
  };
  $$('input[name="entrega"], input[name="facturacion"]').forEach((i) => i.addEventListener("change", sync));
  sync();

  const soloNum = (sel, extra = "") => $(sel)?.addEventListener("input", (e) => (e.target.value = e.target.value.replace(new RegExp(`[^0-9${extra}]`, "g"), "")));
  soloNum("#c-dni"); soloNum("#c-codigoPostal"); soloNum("#c-cuit", "-");

  form.addEventListener("input", (e) => e.target.closest(".campo--error")?.classList.remove("campo--error"));

  form.addEventListener("submit", (e) => {
    $$(".campo--error", form).forEach((c) => c.classList.remove("campo--error"));
    const retiro = form.entrega.value === "retiro";
    const obligatorios = ["email", "nombre", "apellido", "telefono", "dni"].concat(retiro ? [] : ["calle", "numero", "codigoPostal", "ciudad", "provincia"]);
    const vacios = obligatorios.filter((n) => !form[n].value.trim());
    if (vacios.length) {
      e.preventDefault();
      vacios.forEach((n) => form[n].closest(".campo").classList.add("campo--error"));
      form[vacios[0]].focus();
      window.BB.toast("Completá los campos marcados", "error");
    }
  });
})();
