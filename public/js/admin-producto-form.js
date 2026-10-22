(() => {
  const { $, $$, pedir, toast, esc } = window.ADM;
  const form = $("#formProducto");
  if (!form) return;
  const MAX = Number(form.dataset.maxImagenes) || 8;

  const cat = $("#f-categoria"), sub = $("#f-sub");
  const pintarSubs = () => {
    const c = (window.PF_CATEGORIAS || []).find((x) => x.nombre === cat.value);
    const actual = sub.dataset.actual;
    sub.innerHTML = '<option value="">Ninguna</option>' + (c ? c.subs.map((s) => `<option value="${s.id}" ${String(s.id) === actual ? "selected" : ""}>${esc(s.nombre)}</option>`).join("") : "");
  };
  cat.addEventListener("change", () => { sub.dataset.actual = ""; pintarSubs(); });
  pintarSubs();

  const precio = $("#f-precio"), costo = $("#f-costo"), margen = $("#margenTxt");
  const calcular = () => {
    const p = Number(precio.value), c = Number(costo.value);
    if (margen && p > 0 && costo.value !== "") margen.textContent = c > p ? "El costo no puede ser mayor que el precio." : `Ganancia por unidad: ${window.ADM.peso(p - c)} (${Math.round(((p - c) / p) * 100)}% de margen).`;
  };
  precio.addEventListener("input", calcular); costo.addEventListener("input", calcular); calcular();

  $("#agregarColor").addEventListener("click", async () => {
    const nombre = $("#nuevoColorNombre").value.trim();
    const r = await pedir("/admin/colores", { metodo: "POST", datos: { nombre, hex: $("#nuevoColorHex").value } });
    if (!r.ok) return toast(r.mensaje || "No se pudo crear el color", "error");
    const existente = $(`#listaColores input[value="${r.color.valor}"]`);
    if (existente) existente.checked = true;
    else $("#listaColores").insertAdjacentHTML("beforeend", `<label class="color-op" title="${esc(r.color.nombre)}"><input type="checkbox" name="colores" value="${esc(r.color.valor)}" checked><span class="color-op__punto" style="background:${esc(r.color.hex)}"></span><span class="color-op__nombre">${esc(r.color.nombre)}</span></label>`);
    $("#nuevoColorNombre").value = "";
    toast(r.color.nuevo ? "Color agregado ✓" : "Ese color ya existía: lo marqué");
  });

  const input = $("#archivosFotos"), lista = $("#fotosEditor"), zona = $("#zonaSubir");
  const dt = new DataTransfer();
  const cuenta = () => {
    const quedan = $$("[data-existente]:not(.quitada)", lista).length + dt.files.length;
    $("#cuentaFotos").textContent = quedan;

    if (!lista.querySelector('input[name="principal"]:checked')) { const p = lista.querySelector('li:not(.quitada) input[name="principal"]'); if (p) p.checked = true; }
  };
  function pintarNuevas() {
    $$("[data-nueva]", lista).forEach((n) => n.remove());
    [...dt.files].forEach((f, i) => {
      const url = URL.createObjectURL(f);
      lista.insertAdjacentHTML("beforeend", `<li class="foto-item" data-nueva="${i}"><img src="${url}" alt=""><label class="foto-item__principal"><input type="radio" name="principal" value="n-${i}"><span>Principal</span></label><button type="button" class="foto-item__quitar" data-sacar="${i}"><span>Quitar</span></button><span class="chip foto-item__nueva">Nueva</span></li>`);
    });
    input.files = dt.files;
    cuenta();
  }
  function agregar(archivos) {
    for (const f of archivos) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast("Solo JPG, PNG o WEBP", "error"); continue; }
      if (f.size > 2 * 1024 * 1024) { toast(`${f.name} pesa más de 2 MB`, "error"); continue; }
      if ($$("[data-existente]:not(.quitada)", lista).length + dt.files.length >= MAX) { toast(`Máximo ${MAX} fotos`, "error"); break; }
      dt.items.add(f);
    }
    pintarNuevas();
  }
  input.addEventListener("change", () => { const nuevos = [...input.files]; input.files = new DataTransfer().files;

    agregar(nuevos); });
  ["dragover", "dragenter"].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("sobre"); }));
  ["dragleave", "drop"].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove("sobre")));
  zona.addEventListener("drop", (e) => { e.preventDefault(); agregar(e.dataTransfer.files); });
  lista.addEventListener("click", (e) => {
    const sacar = e.target.closest("[data-sacar]");
    if (!sacar) return;
    const n = Number(sacar.dataset.sacar);
    const nuevo = new DataTransfer();
    [...dt.files].forEach((f, i) => i !== n && nuevo.items.add(f));
    dt.items.clear();
    [...nuevo.files].forEach((f) => dt.items.add(f));
    pintarNuevas();
  });
  lista.addEventListener("change", (e) => {
    const q = e.target.closest('input[name="quitarImagenes"]');
    if (q) { q.closest("li").classList.toggle("quitada", q.checked); cuenta(); }
  });
  cuenta();

  form.addEventListener("submit", (e) => {
    const faltan = ["#f-nombre", "#f-categoria", "#f-precio", "#f-costo"].filter((s) => !$(s).value.trim());
    if (!$$('input[name="colores"]:checked', form).length) { e.preventDefault(); toast("Elegí al menos un color", "error"); return; }
    if (faltan.length) { e.preventDefault(); $(faltan[0]).focus(); toast("Completá los campos obligatorios", "error"); }
  });
})();
