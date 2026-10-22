(() => {
  const { $, $$, toast } = window.ADM;
  const form = $("#formInicio");
  if (!form) return;

  $$("[data-texto]", form).forEach((bloque) => {
    const campo = bloque.querySelector("input, textarea");
    const cuenta = bloque.querySelector("[data-cuenta]");
    const restaurar = bloque.querySelector("[data-restaurar]");
    const actualizar = () => {
      if (cuenta) cuenta.textContent = `${campo.value.length}/${campo.maxLength}`;
      if (restaurar) restaurar.hidden = campo.value === campo.dataset.original;
    };
    campo.addEventListener("input", actualizar);
    restaurar?.addEventListener("click", () => { campo.value = campo.dataset.original; actualizar(); });
  });

  $$("[data-foto]", form).forEach((bloque) => {
    const img = bloque.querySelector("[data-foto-img]");
    const archivo = bloque.querySelector("[data-foto-archivo]");
    const ruta = bloque.querySelector("[data-foto-ruta]");
    const nueva = bloque.querySelector("[data-foto-nueva]");
    const deshacer = bloque.querySelector("[data-foto-deshacer]");
    const original = bloque.querySelector("[data-foto-original]");
    const inicial = ruta.value;
    archivo.addEventListener("change", () => {
      const f = archivo.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { archivo.value = ""; return toast("Cada foto puede pesar hasta 3 MB", "error"); }
      img.src = URL.createObjectURL(f);
      nueva.hidden = false; deshacer.hidden = false;
    });
    deshacer.addEventListener("click", () => { archivo.value = ""; img.src = ruta.value; nueva.hidden = true; deshacer.hidden = true; });
    original?.addEventListener("click", () => { archivo.value = ""; ruta.value = ruta.dataset.original; img.src = ruta.value; nueva.hidden = true; deshacer.hidden = true; });
  });

  $("#btnVistaPrevia").addEventListener("click", async () => {
    const datos = new FormData();
    for (const [k, v] of new FormData(form)) if (typeof v === "string") datos.append(k, v);
    const r = await fetch(form.dataset.previa, { method: "POST", body: datos });
    if (!r.ok) return toast("No se pudo armar la vista previa", "error");
    const html = await r.text();
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank");
  });
})();
