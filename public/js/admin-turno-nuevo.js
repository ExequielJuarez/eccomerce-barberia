(() => {
  const { $, pedir, esc } = window.ADM;
  const servicio = $("#nt-servicio");
  const fecha = $("#nt-fecha");
  const hora = $("#nt-hora");
  const ayuda = $("#ntAyuda");
  if (!servicio) return;

  let token = 0;
  async function cargar() {
    hora.disabled = true;
    hora.innerHTML = '<option value="">Elegí servicio y día</option>';
    ayuda.textContent = "";
    if (!servicio.value || !fecha.value) return;
    const yo = ++token;
    hora.innerHTML = "<option value=''>Buscando horarios…</option>";
    const r = await pedir(`/barbero/disponibilidad?servicio=${servicio.value}&fecha=${fecha.value}`);
    if (yo !== token) return;
    if (!r.ok || !r.slots.length) {
      hora.innerHTML = '<option value="">Sin horarios libres</option>';
      ayuda.textContent = r.aviso || r.mensaje || "No quedan horarios libres para ese día.";
      return;
    }
    hora.innerHTML = r.slots.map((h) => `<option value="${esc(h)}">${esc(h)} hs</option>`).join("");
    hora.disabled = false;
    ayuda.textContent = `${r.slots.length} ${r.slots.length === 1 ? "horario libre" : "horarios libres"} en tu agenda.`;
  }

  servicio.addEventListener("change", cargar);
  fecha.addEventListener("change", cargar);
})();
