(() => {
  const { $, $$, toast, pedir } = window.BB;

  document.addEventListener("click", async (e) => {
    const copiar = e.target.closest("#copiarCodigo");
    if (!copiar) return;
    try {
      await navigator.clipboard.writeText(copiar.dataset.codigo);
      toast("Código copiado ✓");
    } catch {
      toast("No se pudo copiar", "error");
    }
  });

  const seguimiento = $("[data-turno-codigo]");
  if (seguimiento && "EventSource" in window) {
    const textos = {
      reservado: "Tu turno quedó reservado",
      confirmado: "¡Tu turno fue confirmado!",
      completado: "Tu turno se completó",
      cancelado: "Tu turno fue cancelado",
      ausente: "Marcamos que no asististe",
    };
    let pendiente;
    const refrescar = async (estado) => {
      try {
        const html = await fetch(location.href, { headers: { Accept: "text/html" } }).then((r) => r.text());
        const nuevo = new DOMParser().parseFromString(html, "text/html").querySelector("[data-turno-vivo]");
        const actual = $("[data-turno-vivo]", seguimiento);
        if (nuevo && actual) actual.innerHTML = nuevo.innerHTML;
        if (estado && textos[estado]) toast(textos[estado]);
      } catch {}
    };
    const es = new EventSource(`/turnos/${seguimiento.dataset.turnoCodigo}/eventos`);
    es.addEventListener("cambio", (e) => {
      clearTimeout(pendiente);
      const { estado } = JSON.parse(e.data);
      pendiente = setTimeout(() => refrescar(estado), 200);
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refrescar();
    });
  }

  const form = $("#formTurno");
  if (!form) return;

  const pasos = $$(".paso", form);
  const horas = $("#horas");
  const ayuda = $("#horasAyuda");
  const boton = $("#btnReservar");
  const indicador = $("#wizPasos");
  const atras = $("#wizAtras");
  const textoResumen = $("#wizResumen");
  const valor = (nombre) => form.querySelector(`input[name="${nombre}"]:checked`);
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const visibles = pasos.filter((p) => !p.hasAttribute("data-saltar"));
  let actual = 0;

  const completo = (clave) => {
    if (clave === "barbero") return Boolean(valor("sucursal")) && actual > visibles.findIndex((p) => p.dataset.clave === "barbero");
    if (clave === "fecha") return Boolean(valor("fecha") && valor("hora"));
    if (clave === "datos") return false;
    return Boolean(valor(clave));
  };

  const pintarResumen = () => {
    const partes = [];
    const servicio = valor("servicio");
    const sucursal = valor("sucursal");
    const barbero = valor("barbero");
    const fecha = valor("fecha");
    const hora = valor("hora");
    if (servicio) partes.push(servicio.dataset.nombre);
    if (sucursal) partes.push(sucursal.dataset.nombre);
    if (sucursal && barbero && (barbero.value || actual > visibles.findIndex((p) => p.dataset.clave === "barbero"))) partes.push(barbero.dataset.nombre);
    if (fecha) partes.push(fecha.dataset.texto);
    if (hora) partes.push(`${hora.value} hs`);
    textoResumen.innerHTML = partes.length ? partes.map((t) => `<b>${t.replace(/[&<>"]/g, "")}</b>`).join(" · ") : "Armá tu turno en 5 pasos rápidos.";
  };

  const pintarPasos = () => {
    indicador.innerHTML = visibles
      .map((p, n) => {
        const estado = n === actual ? "actual" : n < actual ? "hecho" : "";
        return `<li class="${estado}"><button type="button" data-ir="${n}" ${n < actual ? "" : "disabled"} ${n === actual ? 'aria-current="step"' : ""}>${p.dataset.titulo}</button></li>`;
      })
      .join("");
  };

  function ir(n, { desplazar = true } = {}) {
    actual = Math.max(0, Math.min(visibles.length - 1, n));
    pasos.forEach((p) => p.classList.toggle("es-actual", p === visibles[actual]));
    atras.hidden = actual === 0;
    pintarPasos();
    pintarResumen();
    if (desplazar) {
      const caja = form.closest(".hero-turnos__tarjeta");
      const arriba = caja.getBoundingClientRect().top;
      if (arriba < 0 || arriba > innerHeight * 0.5) caja.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
    }
  }
  const siguiente = () => ir(actual + 1);

  indicador.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (b) ir(Number(b.dataset.ir));
  });
  atras.addEventListener("click", () => ir(actual - 1));

  const filtrarPeluqueros = () => {
    const sucursal = valor("sucursal")?.value;
    let hay = 0;
    $$(".peluquero", form).forEach((el) => {
      const sirve = !el.dataset.sucursal || el.dataset.sucursal === sucursal;
      el.hidden = !sirve;
      if (sirve && el.dataset.sucursal) hay++;
    });
    const equipo = $("#equipo");
    equipo.querySelector(".equipo__vacio")?.remove();
    if (!hay) equipo.insertAdjacentHTML("beforeend", '<p class="apagado equipo__vacio">Todavía no hay peluqueros cargados en esta sucursal.</p>');
    const elegido = valor("barbero");
    if (elegido?.value && elegido.closest(".peluquero").hidden) form.querySelector('input[name="barbero"][value=""]').checked = true;
  };

  let token = 0;
  async function cargarHoras() {
    const servicio = valor("servicio");
    const fecha = valor("fecha");
    horas.innerHTML = "";
    if (!servicio || !fecha) {
      ayuda.textContent = "Elegí un día para ver los horarios libres.";
      return;
    }
    ayuda.textContent = "Buscando horarios…";
    const yo = ++token;
    const sucursal = valor("sucursal")?.value || "";
    const barbero = valor("barbero")?.value || "";
    const r = await pedir(
      `/turnos/disponibilidad?servicio=${servicio.value}&fecha=${fecha.value}${sucursal ? `&sucursal=${sucursal}` : ""}${barbero ? `&barbero=${barbero}` : ""}`
    );
    if (yo !== token) return;
    if (!r.ok) {
      ayuda.textContent = r.mensaje || "No pudimos cargar los horarios.";
      return;
    }
    if (!r.slots.length) {
      ayuda.textContent = r.aviso || "No quedan horarios para ese día. Probá con otro.";
      return;
    }
    const quien = barbero ? valor("barbero").dataset.nombre : "";
    ayuda.textContent = `${r.slots.length} ${r.slots.length === 1 ? "horario libre" : "horarios libres"}${quien ? ` con ${quien}` : ""}`;
    horas.innerHTML = r.slots.map((h) => `<label class="hora"><input type="radio" name="hora" value="${h}"><span>${h}</span></label>`).join("");
  }

  form.addEventListener("change", (e) => {
    const nombre = e.target.name;
    if (nombre === "servicio") {
      cargarHoras();
      siguiente();
    }
    if (nombre === "sucursal") {
      filtrarPeluqueros();
      cargarHoras();
      siguiente();
    }
    if (nombre === "barbero") {
      cargarHoras();
      siguiente();
    }
    if (nombre === "fecha") cargarHoras();
    if (nombre === "hora") siguiente();
    pintarResumen();
  });

  let enviando = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (enviando) return;
    const servicio = valor("servicio");
    const sucursal = valor("sucursal");
    const fecha = valor("fecha");
    const hora = valor("hora");
    const cliente = form.cliente.value.trim();
    const telefono = form.telefono.value.trim();
    if (!servicio || !sucursal || !fecha || !hora) return toast("Completá servicio, sucursal, día y horario", "error");
    if (cliente.length < 2) {
      form.cliente.focus();
      return toast("Ingresá tu nombre", "error");
    }
    if (telefono.replace(/D/g, "").length < 8) {
      form.telefono.focus();
      return toast("Ingresá un teléfono válido", "error");
    }
    enviando = true;
    boton.classList.add("is-cargando");
    const r = await pedir("/turnos", {
      metodo: "POST",
      datos: {
        servicio: servicio.value,
        sucursal: sucursal.value,
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
    cargarHoras();
    const iFecha = visibles.findIndex((p) => p.dataset.clave === "fecha");
    ir(iFecha);
  });

  filtrarPeluqueros();
  ir(0, { desplazar: false });
})();
