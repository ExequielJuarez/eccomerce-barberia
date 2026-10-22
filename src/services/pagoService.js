const crypto = require("crypto");
const pedidoService = require("./pedidoService");
const notificaciones = require("./notificacionService");

const CONFIG = {
  token: process.env.MP_ACCESS_TOKEN || "",
  secreto: process.env.MP_WEBHOOK_SECRET || "",
  api: (process.env.MP_API_URL || "https://api.mercadopago.com").replace(/\/$/, ""),
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  marca: process.env.MP_NOMBRE_TIENDA || "Tienda",
  resumenTarjeta: (process.env.MP_RESUMEN_TARJETA || "").slice(0, 22),
  maxCuotas: Number(process.env.MP_MAX_CUOTAS) || 6,
  venceHoras: Number(process.env.PAGO_VENCE_HORAS) || 48,
};

const modo = () => (CONFIG.token ? "mercadopago" : process.env.NODE_ENV === "production" ? "desactivado" : "demo");
const esTokenDePrueba = () => CONFIG.token.startsWith("TEST-");

const ESTADOS_MP = {
  approved: "aprobado",
  authorized: "pendiente",
  pending: "pendiente",
  in_process: "pendiente",
  in_mediation: "pendiente",
  rejected: "rechazado",
  cancelled: "rechazado",
  refunded: "reembolsado",
  charged_back: "reembolsado",
};

const MEDIOS = {
  visa: "Visa",
  master: "Mastercard",
  amex: "American Express",
  naranja: "Naranja",
  cabal: "Cabal",
  tarshop: "Tarjeta Shopping",
  cencosud: "Cencosud",
  diners: "Diners",
  argencard: "Argencard",
  cmr: "CMR",
  maestro: "Maestro",
  debvisa: "Visa Débito",
  debmaster: "Mastercard Débito",
  debcabal: "Cabal Débito",
  account_money: "Dinero en cuenta de Mercado Pago",
  consumer_credits: "Cuotas sin tarjeta de Mercado Pago",
  rapipago: "Rapipago",
  pagofacil: "Pago Fácil",
};

const RECHAZOS = {
  cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  cc_rejected_bad_filled_security_code: "El código de seguridad no es correcto.",
  cc_rejected_bad_filled_date: "La fecha de vencimiento no es correcta.",
  cc_rejected_bad_filled_card_number: "El número de tarjeta no es correcto.",
  cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
  cc_rejected_call_for_authorize: "Tenés que autorizar el pago con el banco de la tarjeta.",
  cc_rejected_card_disabled: "La tarjeta no está activa. Llamá al banco para habilitarla.",
  cc_rejected_duplicated_payment: "Ya hiciste un pago igual hace un momento.",
  cc_rejected_high_risk: "El pago fue rechazado por seguridad. Probá con otro medio.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos. Probá con otra tarjeta.",
  cc_rejected_other_reason: "El banco rechazó el pago. Probá con otra tarjeta.",
};

function detalleDelPago(pago) {
  const medio = MEDIOS[pago.payment_method_id] || pago.payment_method_id || "Mercado Pago";
  const partes = [medio + (pago.card?.last_four_digits ? ` terminada en ${pago.card.last_four_digits}` : "")];
  if (pago.installments > 1) partes.push(`${pago.installments} cuotas`);
  else if (pago.card?.last_four_digits) partes.push("1 cuota");
  return partes.join(" · ").slice(0, 120);
}

async function llamar(metodo, ruta, cuerpo, idempotencia) {
  const respuesta = await fetch(CONFIG.api + ruta, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${CONFIG.token}`,
      "Content-Type": "application/json",
      ...(idempotencia ? { "X-Idempotency-Key": idempotencia } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(`Mercado Pago respondió ${respuesta.status}: ${datos.message || datos.error || "error"}`);
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

async function iniciar(pedido) {
  if (modo() === "demo") return `/pagos/demo/${pedido.numero}`;
  if (modo() === "desactivado") throw new Error("El pago con tarjeta no está configurado (falta MP_ACCESS_TOKEN)");

  const publica = CONFIG.appUrl.startsWith("https://");
  const retorno = `${CONFIG.appUrl}/pagos/retorno?pedido=${pedido.numero}`;
  const vence = new Date(new Date(pedido.fecha || Date.now()).getTime() + CONFIG.venceHoras * 3600 * 1000);

  const preferencia = await llamar(
    "POST",
    "/checkout/preferences",
    {
      items: [
        {
          id: String(pedido.numero),
          title: `Pedido #${pedido.numero} · ${CONFIG.marca}`.slice(0, 250),
          description: pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(", ").slice(0, 250),
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(pedido.total),
        },
      ],

      external_reference: String(pedido.numero),
      back_urls: { success: retorno, pending: retorno, failure: retorno },

      ...(publica ? { auto_return: "approved", notification_url: `${CONFIG.appUrl}/pagos/webhook` } : {}),
      ...(CONFIG.resumenTarjeta ? { statement_descriptor: CONFIG.resumenTarjeta } : {}),
      payment_methods: { installments: CONFIG.maxCuotas },
      expires: true,
      expiration_date_to: vence.toISOString(),
      metadata: { pedido: pedido.numero },
    },
    `pedido-${pedido.numero}-${Date.now()}`
  );

  return preferencia.init_point;
}

async function sincronizar(pagoId, pedidoEsperado = null) {
  if (modo() !== "mercadopago" || !/^\d{1,20}$/.test(String(pagoId))) return null;
  const pago = await llamar("GET", `/v1/payments/${pagoId}`);
  return aplicarPago(pago, pedidoEsperado);
}

async function aplicarPago(pago, pedidoEsperado = null) {
  const numero = Number(pago.external_reference);
  if (!numero || (pedidoEsperado && numero !== Number(pedidoEsperado))) return null;

  const pedido = await pedidoService.obtener(numero);
  if (!pedido) return null;

  let estado = ESTADOS_MP[pago.status] || "pendiente";

  if (estado === "aprobado" && (pago.currency_id !== "ARS" || Number(pago.transaction_amount) + 0.01 < Number(pedido.total))) {
    console.error(`⚠️  Pago ${pago.id} del pedido #${numero} no coincide con el total; no se aprueba.`);
    estado = "pendiente";
  }

  const resultado = await pedidoService.registrarPago(numero, {
    estado,
    pagoId: pago.id,
    detalle: detalleDelPago(pago),
    fecha: pago.date_approved ? new Date(pago.date_approved) : null,
  });
  if (resultado) {
    resultado.motivo = estado === "rechazado" ? RECHAZOS[pago.status_detail] || "El pago no se pudo completar." : null;
    await avisarAlAdmin(resultado, estado);
  }
  return resultado;
}

async function sincronizarPedido(numero) {
  if (modo() !== "mercadopago") return null;
  const r = await llamar("GET", `/v1/payments/search?external_reference=${Number(numero)}&sort=date_created&criteria=desc&limit=20`);
  const pagos = (r.results || []).filter((p) => String(p.external_reference) === String(numero));
  const elegido = pagos.find((p) => p.status === "approved") || pagos[0];
  return elegido ? aplicarPago(elegido, numero) : null;
}

async function revisarSinPagar() {
  if (modo() !== "mercadopago") return 0;
  const numeros = await pedidoService.sinPagarRecientes(CONFIG.venceHoras + 1);
  let actualizados = 0;
  for (const numero of numeros) {
    try {
      const r = await sincronizarPedido(numero);
      if (r?.cambio) actualizados++;
    } catch (error) {
      console.error(`No se pudo consultar el pago del pedido #${numero}:`, error.message);
    }
  }
  return actualizados;
}

function revisarSinPagarRapido(ms = 4000) {
  return Promise.race([revisarSinPagar().catch(() => 0), new Promise((r) => setTimeout(() => r(0), ms))]);
}

async function avisarAlAdmin(resultado, estado) {
  const { pedido, cambio, aviso } = resultado;
  try {
    if (aviso) {
      await notificaciones.crear({
        tipo: "pedido",
        titulo: `Revisar pedido #${pedido.numero}`,
        mensaje: `Se pagó pero estaba cancelado: ${aviso}. Hay que devolver el dinero.`,
        url: `/admin/pedidos?q=${pedido.numero}`,
        pedidoId: pedido.numero,
      });
    } else if (cambio && estado === "aprobado") {
      await notificaciones.pagoAprobado(pedido);
    }
  } catch (error) {
    console.error("No se pudo avisar del pago:", error.message);
  }
}

async function simular(numero, resultado) {
  if (modo() !== "demo") return null;
  const estados = { aprobado: "aprobado", rechazado: "rechazado", pendiente: "pendiente" };
  if (!estados[resultado]) return null;
  const detalles = {
    aprobado: "Visa terminada en 4242 · 3 cuotas (demo)",
    rechazado: "Visa terminada en 4242 (demo)",
    pendiente: "Pago en proceso (demo)",
  };
  const r = await pedidoService.registrarPago(numero, {
    estado: estados[resultado],
    pagoId: `demo-${numero}`,
    detalle: detalles[resultado],
  });
  if (r) {
    r.motivo = resultado === "rechazado" ? "El banco rechazó el pago (simulado)." : null;
    await avisarAlAdmin(r, estados[resultado]);
  }
  return r;
}

function firmaValida(req) {
  if (!CONFIG.secreto) return true;
  const firma = String(req.get("x-signature") || "");
  const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=")));
  if (!partes.ts || !partes.v1) return false;
  const dataId = String(req.query["data.id"] || req.body?.data?.id || "").toLowerCase();
  const manifiesto = `id:${dataId};request-id:${req.get("x-request-id") || ""};ts:${partes.ts};`;
  const esperado = crypto.createHmac("sha256", CONFIG.secreto).update(manifiesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(partes.v1));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function pagoDeLaNotificacion(req) {
  const tipo = req.query.type || req.query.topic || req.body?.type;
  if (tipo !== "payment") return null;
  return req.query["data.id"] || req.body?.data?.id || req.query.id || null;
}

function datosTransferencia() {
  return {
    alias: process.env.TRANSFERENCIA_ALIAS || "(ALIAS.DE.LA.TIENDA)",
    cbu: process.env.TRANSFERENCIA_CBU || "(CBU / CVU de 22 números)",
    titular: process.env.TRANSFERENCIA_TITULAR || "(TITULAR DE LA CUENTA)",
    banco: process.env.TRANSFERENCIA_BANCO || "(BANCO O BILLETERA)",
  };
}

function vencerPeriodicamente() {
  const revisar = () =>
    revisarSinPagar()
      .then((n) => n && console.log(`💳 Pagos confirmados con Mercado Pago: ${n}`))
      .catch((error) => console.error("No se pudieron revisar los pagos:", error.message));
  const vencer = () =>
    revisar()
      .then(() => pedidoService.vencerImpagos(CONFIG.venceHoras))
      .then((ids) => ids.length && console.log(`⏱  Pedidos sin pagar cancelados: ${ids.join(", ")}`))
      .catch((error) => console.error("No se pudieron vencer los pedidos impagos:", error.message));
  vencer();
  setInterval(revisar, 2 * 60 * 1000).unref();
  setInterval(vencer, 30 * 60 * 1000).unref();
}

module.exports = {
  modo,
  esTokenDePrueba,
  venceHoras: () => CONFIG.venceHoras,
  iniciar,
  sincronizar,
  sincronizarPedido,
  revisarSinPagarRapido,
  simular,
  firmaValida,
  pagoDeLaNotificacion,
  datosTransferencia,
  vencerPeriodicamente,
};
