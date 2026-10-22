const crypto = require("crypto");
const { EventEmitter } = require("events");
const { Op } = require("sequelize");
const db = require("../model/database/models");
const notificaciones = require("./notificacionService");

const eventos = new EventEmitter();
eventos.setMaxListeners(200);

const ZONA = "America/Argentina/Buenos_Aires";
const VENTANA_DIAS = 30;
const PASO = Number(process.env.TURNOS_PASO) || 30;
const ANTELACION_MIN = Number(process.env.TURNOS_ANTELACION_MIN) || 30;
const MAX_ACTIVOS_POR_TELEFONO = 3;
const ESTADOS = ["reservado", "confirmado", "completado", "cancelado", "ausente"];
const ESTADOS_QUE_OCUPAN = ["reservado", "confirmado", "completado"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const dosDigitos = (n) => String(n).padStart(2, "0");
const aMinutos = (hora) => {
  const [h, m] = String(hora).split(":").map(Number);
  return h * 60 + m;
};
const aHora = (minutos) => `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`;
const recortar = (hora) => String(hora).slice(0, 5);

function ahora() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, minutos: Number(partes.hour) * 60 + Number(partes.minute) };
}

const sumarDias = (fecha, dias) => {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return `${f.getUTCFullYear()}-${dosDigitos(f.getUTCMonth() + 1)}-${dosDigitos(f.getUTCDate())}`;
};
const diaDeSemana = (fecha) => {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const fechaValida = (fecha) => /^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`));

function etiquetaFecha(fecha) {
  const [, m, d] = fecha.split("-").map(Number);
  return `${DIAS[diaDeSemana(fecha)]} ${d} de ${MESES[m - 1]}`;
}

function limpiarTelefono(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : null;
}

function enlaceWhatsapp(telefono, texto = "") {
  const d = String(telefono).replace(/\D/g, "");
  const completo = d.startsWith("54") ? d : d.length <= 11 ? `549${d.replace(/^0/, "")}` : d;
  return `https://wa.me/${completo}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

function planoTurno(t) {
  const x = t.get ? t.get({ plain: true }) : t;
  return {
    id: x.id,
    codigo: x.codigo,
    servicio: x.servicio,
    barbero: x.barbero,
    cliente: x.cliente,
    telefono: x.telefono,
    notas: x.notas,
    fecha: x.fecha,
    fechaTexto: etiquetaFecha(x.fecha),
    inicio: recortar(x.inicio),
    fin: recortar(x.fin),
    estado: x.estado,
    creado: x.creado_en,
  };
}

async function servicios({ soloActivos = true } = {}) {
  const filas = await db.ServicioTurno.findAll({
    where: soloActivos ? { activo: true } : {},
    order: [["orden", "ASC"], ["id", "ASC"]],
    raw: true,
  });
  return filas.map((s) => ({ ...s, precio: s.precio === null ? null : Number(s.precio) }));
}

async function barberos({ soloActivos = true } = {}) {
  return db.Barbero.findAll({ where: soloActivos ? { activo: true } : {}, order: [["orden", "ASC"], ["id", "ASC"]], raw: true });
}

async function horarios() {
  const filas = await db.HorarioTurno.findAll({ order: [["diaSemana", "ASC"], ["desde", "ASC"]], raw: true });
  return filas.map((h) => ({ id: h.id, diaSemana: h.diaSemana, desde: recortar(h.desde), hasta: recortar(h.hasta) }));
}

async function bloqueos() {
  const hoy = ahora().fecha;
  return db.BloqueoTurno.findAll({ where: { fecha: { [Op.gte]: hoy } }, order: [["fecha", "ASC"]], raw: true });
}

async function diasDisponibles() {
  const [filasHorario, filasBloqueo] = await Promise.all([horarios(), bloqueos()]);
  const abiertos = new Set(filasHorario.map((h) => h.diaSemana));
  const cerrados = new Map(filasBloqueo.map((b) => [b.fecha, b.motivo]));
  const hoy = ahora().fecha;
  const lista = [];
  for (let i = 0; i <= VENTANA_DIAS; i++) {
    const fecha = sumarDias(hoy, i);
    const dow = diaDeSemana(fecha);
    const [, m, d] = fecha.split("-").map(Number);
    lista.push({
      fecha,
      dia: d,
      mes: MESES[m - 1],
      semana: DIAS_CORTO[dow],
      hoy: i === 0,
      abierto: abiertos.has(dow) && !cerrados.has(fecha),
      motivo: cerrados.get(fecha) || null,
    });
  }
  return lista;
}

async function ocupacion(fecha, transaction) {
  const filas = await db.Turno.findAll({
    where: { fecha, estado: { [Op.in]: ESTADOS_QUE_OCUPAN } },
    attributes: ["barberoId", "inicio", "fin"],
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    raw: true,
  });
  const mapa = new Map();
  for (const f of filas) {
    if (!mapa.has(f.barberoId)) mapa.set(f.barberoId, []);
    mapa.get(f.barberoId).push([aMinutos(f.inicio), aMinutos(f.fin)]);
  }
  return mapa;
}

const libre = (ocupados = [], inicio, fin) => ocupados.every(([a, b]) => fin <= a || inicio >= b);

async function reglasDelDia(fecha) {
  if (!fechaValida(fecha)) return { error: "Fecha inválida" };
  const hoy = ahora().fecha;
  if (fecha < hoy || fecha > sumarDias(hoy, VENTANA_DIAS)) return { error: "Esa fecha no está disponible para reservar" };
  const bloqueo = await db.BloqueoTurno.findOne({ where: { fecha }, raw: true });
  if (bloqueo) return { error: bloqueo.motivo ? `Cerrado: ${bloqueo.motivo}` : "Ese día no atendemos" };
  const rangos = (await horarios()).filter((h) => h.diaSemana === diaDeSemana(fecha));
  if (!rangos.length) return { error: "Ese día no atendemos" };
  return { rangos, hoy };
}

function calcularSlots({ rangos, hoy, fecha, duracion, barberosIds, ocupados }) {
  const reloj = ahora();
  const minimo = fecha === hoy ? reloj.minutos + ANTELACION_MIN : 0;
  const slots = [];
  for (const { desde, hasta } of rangos) {
    const a = aMinutos(desde);
    const b = aMinutos(hasta);
    for (let t = a; t + duracion <= b; t += PASO) {
      if (t < minimo) continue;
      const disponibles = barberosIds.filter((id) => libre(ocupados.get(id), t, t + duracion));
      if (disponibles.length) slots.push({ hora: aHora(t), barberos: disponibles });
    }
  }
  return slots;
}

async function disponibilidad({ servicioId, fecha, barberoId = null }) {
  const servicio = await db.ServicioTurno.findOne({ where: { id: Number(servicioId) || 0, activo: true }, raw: true });
  if (!servicio) return { ok: false, mensaje: "Elegí un servicio válido" };
  const reglas = await reglasDelDia(fecha);
  if (reglas.error) return { ok: true, slots: [], aviso: reglas.error };

  let lista = await barberos();
  if (barberoId) lista = lista.filter((b) => b.id === Number(barberoId));
  if (!lista.length) return { ok: false, mensaje: "No hay profesionales disponibles" };

  const ocupados = await ocupacion(fecha);
  const slots = calcularSlots({
    rangos: reglas.rangos,
    hoy: reglas.hoy,
    fecha,
    duracion: servicio.duracion,
    barberosIds: lista.map((b) => b.id),
    ocupados,
  });
  return { ok: true, slots: slots.map((s) => s.hora), aviso: slots.length ? null : "No quedan horarios para ese día" };
}

function nuevoCodigo() {
  const bytes = crypto.randomBytes(6);
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join("");
}

async function crear({ servicioId, barberoId = null, fecha, hora, cliente, telefono, notas = "" }) {
  const tel = limpiarTelefono(telefono);
  if (!tel) return { ok: false, mensaje: "Ingresá un teléfono válido, con característica" };
  const nombre = String(cliente || "").trim().replace(/\s+/g, " ");
  if (nombre.length < 2) return { ok: false, mensaje: "Ingresá tu nombre" };
  if (!/^\d{2}:\d{2}$/.test(String(hora))) return { ok: false, mensaje: "Elegí un horario" };

  const servicio = await db.ServicioTurno.findOne({ where: { id: Number(servicioId) || 0, activo: true } });
  if (!servicio) return { ok: false, mensaje: "Elegí un servicio válido" };
  const reglas = await reglasDelDia(fecha);
  if (reglas.error) return { ok: false, mensaje: reglas.error };

  const activos = await db.Turno.count({
    where: { telefono: tel, estado: { [Op.in]: ["reservado", "confirmado"] }, fecha: { [Op.gte]: reglas.hoy } },
  });
  if (activos >= MAX_ACTIVOS_POR_TELEFONO) {
    return { ok: false, mensaje: "Ya tenés turnos reservados. Cancelá uno para sacar otro." };
  }

  let lista = await barberos();
  if (barberoId) lista = lista.filter((b) => b.id === Number(barberoId));
  if (!lista.length) return { ok: false, mensaje: "No hay profesionales disponibles" };

  const turno = await db.sequelize.transaction(async (t) => {
    const ocupados = await ocupacion(fecha, t);
    const slots = calcularSlots({
      rangos: reglas.rangos,
      hoy: reglas.hoy,
      fecha,
      duracion: servicio.duracion,
      barberosIds: lista.map((b) => b.id),
      ocupados,
    });
    const slot = slots.find((s) => s.hora === hora);
    if (!slot) return null;
    const elegido = lista.find((b) => b.id === slot.barberos[0]);
    const inicio = aMinutos(hora);

    for (let intento = 0; intento < 5; intento++) {
      try {
        return await db.Turno.create(
          {
            codigo: nuevoCodigo(),
            servicioId: servicio.id,
            barberoId: elegido.id,
            servicio: servicio.nombre,
            barbero: elegido.nombre,
            cliente: nombre.slice(0, 90),
            telefono: tel,
            notas: String(notas || "").trim().slice(0, 200) || null,
            fecha,
            inicio: aHora(inicio),
            fin: aHora(inicio + servicio.duracion),
            estado: "reservado",
          },
          { transaction: t }
        );
      } catch (error) {
        if (error.name !== "SequelizeUniqueConstraintError") throw error;
      }
    }
    return null;
  });

  if (!turno) return { ok: false, mensaje: "Ese horario se acaba de ocupar. Elegí otro." };

  const resumen = planoTurno(turno);
  eventos.emit("cambio", resumen);
  notificaciones
    .crear({
      tipo: "turno",
      titulo: `Turno nuevo · ${resumen.inicio} hs`,
      mensaje: `${resumen.cliente} · ${resumen.servicio} · ${resumen.fechaTexto}`,
      url: `/admin/turnos?fecha=${resumen.fecha}`,
    })
    .catch(() => {});
  return { ok: true, turno: resumen };
}

async function porCodigo(codigo) {
  if (!/^[A-Z0-9]{6,12}$/i.test(String(codigo))) return null;
  const t = await db.Turno.findOne({ where: { codigo: String(codigo).toUpperCase() } });
  return t ? planoTurno(t) : null;
}

async function cancelarPorCodigo(codigo) {
  const turno = await db.Turno.findOne({ where: { codigo: String(codigo).toUpperCase() } });
  if (!turno) return { ok: false, mensaje: "No encontramos ese turno" };
  if (!["reservado", "confirmado"].includes(turno.estado)) return { ok: false, mensaje: "Ese turno ya no se puede cancelar" };
  const reloj = ahora();
  if (turno.fecha < reloj.fecha || (turno.fecha === reloj.fecha && aMinutos(turno.inicio) <= reloj.minutos)) {
    return { ok: false, mensaje: "Ese turno ya pasó" };
  }
  await turno.update({ estado: "cancelado" });
  const resumen = planoTurno(turno);
  eventos.emit("cambio", resumen);
  return { ok: true, turno: resumen };
}

async function agenda(fecha) {
  const filas = await db.Turno.findAll({ where: { fecha }, order: [["inicio", "ASC"], ["id", "ASC"]] });
  return filas.map(planoTurno);
}

async function proximos(limite = 8) {
  const reloj = ahora();
  const filas = await db.Turno.findAll({
    where: {
      estado: { [Op.in]: ["reservado", "confirmado"] },
      [Op.or]: [{ fecha: { [Op.gt]: reloj.fecha } }, { fecha: reloj.fecha, inicio: { [Op.gte]: aHora(reloj.minutos) } }],
    },
    order: [["fecha", "ASC"], ["inicio", "ASC"]],
    limit: limite,
  });
  return filas.map(planoTurno);
}

async function resumenDia(fecha) {
  const lista = await agenda(fecha);
  const cuenta = (e) => lista.filter((t) => t.estado === e).length;
  return {
    total: lista.filter((t) => t.estado !== "cancelado").length,
    reservados: cuenta("reservado"),
    confirmados: cuenta("confirmado"),
    completados: cuenta("completado"),
    cancelados: cuenta("cancelado"),
  };
}

async function pendientesHoy() {
  const hoy = ahora().fecha;
  return db.Turno.count({ where: { fecha: { [Op.gte]: hoy }, estado: "reservado" } });
}

async function cambiarEstado(id, estado) {
  if (!ESTADOS.includes(estado)) return null;
  const turno = await db.Turno.findByPk(id);
  if (!turno) return null;
  await turno.update({ estado });
  const resumen = planoTurno(turno);
  eventos.emit("cambio", resumen);
  return resumen;
}

async function guardarServicio(id, datos) {
  const campos = {
    nombre: String(datos.nombre || "").trim().slice(0, 80),
    detalle: String(datos.detalle || "").trim().slice(0, 160) || null,
    duracion: Math.min(480, Math.max(5, parseInt(datos.duracion, 10) || 30)),
    precio: datos.precio === "" || datos.precio === undefined ? null : Math.max(0, Number(datos.precio) || 0),
    activo: datos.activo === "1" || datos.activo === true,
  };
  if (campos.nombre.length < 2) return { ok: false, mensaje: "El servicio necesita un nombre" };
  if (id) {
    const s = await db.ServicioTurno.findByPk(id);
    if (!s) return { ok: false, mensaje: "No existe ese servicio" };
    await s.update(campos);
    return { ok: true };
  }
  const orden = ((await db.ServicioTurno.max("orden")) || 0) + 1;
  await db.ServicioTurno.create({ ...campos, activo: true, orden });
  return { ok: true };
}

async function borrarServicio(id) {
  await db.ServicioTurno.destroy({ where: { id } });
}

async function guardarBarbero(id, datos) {
  const nombre = String(datos.nombre || "").trim().slice(0, 60);
  if (nombre.length < 2) return { ok: false, mensaje: "Ingresá un nombre" };
  if (id) {
    const b = await db.Barbero.findByPk(id);
    if (!b) return { ok: false, mensaje: "No existe ese profesional" };
    await b.update({ nombre, activo: datos.activo === "1" });
    return { ok: true };
  }
  const orden = ((await db.Barbero.max("orden")) || 0) + 1;
  await db.Barbero.create({ nombre, activo: true, orden });
  return { ok: true };
}

async function borrarBarbero(id) {
  const activos = await db.Barbero.count({ where: { activo: true, id: { [Op.ne]: id } } });
  if (!activos) return { ok: false, mensaje: "Tiene que quedar al menos un profesional activo" };
  await db.Barbero.destroy({ where: { id } });
  return { ok: true };
}

async function guardarHorarios(cuerpo) {
  const filas = [];
  for (let dia = 0; dia < 7; dia++) {
    if (cuerpo[`abierto_${dia}`] !== "1") continue;
    const desde = String(cuerpo[`desde_${dia}`] || "");
    const hasta = String(cuerpo[`hasta_${dia}`] || "");
    if (!/^\d{2}:\d{2}$/.test(desde) || !/^\d{2}:\d{2}$/.test(hasta) || aMinutos(hasta) <= aMinutos(desde)) {
      return { ok: false, mensaje: `Revisá el horario de ${DIAS[dia]}` };
    }
    filas.push({ diaSemana: dia, desde, hasta });
  }
  await db.sequelize.transaction(async (t) => {
    await db.HorarioTurno.destroy({ where: {}, transaction: t });
    if (filas.length) await db.HorarioTurno.bulkCreate(filas, { transaction: t });
  });
  return { ok: true };
}

async function crearBloqueo({ fecha, motivo }) {
  if (!fechaValida(fecha)) return { ok: false, mensaje: "Fecha inválida" };
  await db.BloqueoTurno.findOrCreate({ where: { fecha }, defaults: { fecha, motivo: String(motivo || "").trim().slice(0, 80) || null } });
  return { ok: true };
}

async function borrarBloqueo(id) {
  await db.BloqueoTurno.destroy({ where: { id } });
}

module.exports = {
  eventos,
  ESTADOS,
  VENTANA_DIAS,
  DIAS,
  ahora,
  fechaValida,
  sumarDias,
  etiquetaFecha,
  enlaceWhatsapp,
  servicios,
  barberos,
  horarios,
  bloqueos,
  diasDisponibles,
  disponibilidad,
  crear,
  porCodigo,
  cancelarPorCodigo,
  agenda,
  proximos,
  resumenDia,
  pendientesHoy,
  cambiarEstado,
  guardarServicio,
  borrarServicio,
  guardarBarbero,
  borrarBarbero,
  guardarHorarios,
  crearBloqueo,
  borrarBloqueo,
};
