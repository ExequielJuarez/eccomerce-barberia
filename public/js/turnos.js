(() => {
  const { $, $$, toast, pedir } = window.BB;

  const copiar = $("#copiarCodigo");
  if (copiar) {
    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copiar.dataset.codigo);
        toast("Código copiado ✓");
      } catch {
        toast("No se pudo copiar", "error");
      }
    });
  }

  const cancelar = $("#formCancelar");
  if (cancelar) {
    cancelar.addEventListener("submit", (e) => {
      if (!confirm("¿Querés cancelar este turno?")) e.preventDefault();
    });
  }

  const form = $("#formTurno");
  if (!form) return;

  const pasos = $$(".paso", form);
  const horas = $("#horas");
  const ayuda = $("#horasAyuda");
  const boton = $("#btnReservar");
  const resumen = (clave) => $(`[data-r="${clave}"]`);
  const valor = (nombre) => form.querySelector(`input[name="${nombre}"]:checked`);
  const paso = (clave) => pasos.find((p) => p.dataset.clave === clave);

  const desbloquear = (...elementos) => elementos.forEach((p) => p && p.classList.remove("paso--bloqueado"));
  const bloquear = (...elementos) => elementos.forEach((p) => p && p.classList.add("paso--bloqueado"));

  const irA = (el) => {
    if (!el) return;
    const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  };

  const pintarResumen = () => {
    const servicio = valor("servicio");
    const barbero = valor("barbero");
    const fecha = valor("fecha");
    const hora = valor("hora");
    resumen("servicio").textContent = servicio ? servicio.dataset.nombre : "—";
    if (resumen("barbero")) resumen("barbero").textContent = barbero ? barbero.dataset.nombre : "Sin preferencia";
    resumen("fecha").textContent = fecha ? fecha.dataset.texto : "—";
    resumen("hora").textContent = hora ? `${hora.value} hs` : "—";
    resumen("duracion").textContent = servicio ? `${servicio.dataset.duracion} min${servicio.dataset.precio ? " · " + servicio.dataset.precio : ""}` : "—";
  };

  let token = 0;
  async function cargarHoras({ mover = false } = {}) {
    const servicio = valor("servicio");
    const fecha = valor("fecha");
    horas.innerHTML = "";
    bloquear(paso("datos"));
    if (!servicio || !fecha) {
      ayuda.textContent = "Primero elegí el servicio y el día.";
      return;
    }
    ayuda.textContent = "Buscando horarios…";
    desbloquear(paso("hora"));
    const actual = ++token;
    const barbero = valor("barbero")?.value || "";
    const r = await pedir(`/turnos/disponibilidad?servicio=${servicio.value}&fecha=${fecha.value}${barbero ? `&barbero=${barbero}` : ""}`);
    if (actual !== token) return;
    if (!r.ok) {
      ayuda.textContent = r.mensaje || "No pudimos cargar los horarios.";
      return;
    }
    if (!r.slots.length) {
      ayuda.textContent = r.aviso || "No quedan horarios para ese día. Probá con otro.";
      return;
    }
    ayuda.textContent = `${r.slots.length} ${r.slots.length === 1 ? "horario disponible" : "horarios disponibles"}`;
    horas.innerHTML = r.slots
      .map((h) => `<label class="hora"><input type="radio" name="hora" value="${h}"><span>${h}</span></label>`)
      .join("");
    if (mover) irA(paso("hora"));
  }

  form.addEventListener("change", (e) => {
    const nombre = e.target.name;
    if (nombre === "servicio") {
      desbloquear(...pasos.filter((p) => p.dataset.paso === "2" || p.dataset.clave === "fecha"));
      cargarHoras();
      if (!valor("fecha")) irA(paso("fecha"));
    }
    if (nombre === "barbero") cargarHoras();
    if (nombre === "fecha") cargarHoras({ mover: true });
    if (nombre === "hora") {
      desbloquear(paso("datos"));
      irA(paso("datos"));
    }
    pintarResumen();
  });

  let enviando = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (enviando) return;
    const servicio = valor("servicio");
    const fecha = valor("fecha");
    const hora = valor("hora");
    const cliente = form.cliente.value.trim();
    const telefono = form.telefono.value.trim();
    if (!servicio || !fecha || !hora) return toast("Completá servicio, día y horario", "error");
    if (cliente.length < 2) {
      form.cliente.focus();
      return toast("Ingresá tu nombre", "error");
    }
    if (telefono.replace(/\D/g, "").length < 8) {
      form.telefono.focus();
      return toast("Ingresá un teléfono válido", "error");
    }
    enviando = true;
    boton.classList.add("is-cargando");
    const r = await pedir("/turnos", {
      metodo: "POST",
      datos: {
        servicio: servicio.value,
        barbero: valor("barbero")?.value || "",
        fecha: fecha.value,
        hora: hora.value,
        cliente,
        telefono,
        notas: form.notas.value.trim(),
      },
    });
    if (r.ok && r.codigo) {
      location.href = `/turnos/${r.codigo}`;
      return;
    }
    enviando = false;
    boton.classList.remove("is-cargando");
    toast(r.mensaje || "No se pudo reservar el turno", "error");
    cargarHoras({ mover: true });
  });

  pintarResumen();
})();
