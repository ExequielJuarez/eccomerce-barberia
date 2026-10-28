const tienda = require("../helpers/tienda");

const pesos = (n) => "$" + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
const digitos = (v) => String(v || "").replace(/\D/g, "");

// "callmebot" (gratis, número propio) | "cloud" (API oficial de Meta) | vacío = no se envía nada
const proveedor = () => (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
const destino = () => digitos(process.env.WHATSAPP_PEDIDOS_NUMERO || process.env.TIENDA_WHATSAPP);

function modo() {
  const p = proveedor();
  if (!destino()) return "desactivado";
  if (p === "callmebot" && process.env.CALLMEBOT_APIKEY) return "callmebot";
  if (p === "cloud" && process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_ID) return "cloud";
  return "desactivado";
}

function textoPedido(pedido) {
  const dom = pedido.entrega === "domicilio";
  const lineas = [
    `🛒 *Nuevo pedido #${pedido.numero}*`,
    "",
    ...pedido.items.map((i) => `• ${i.cantidad} x ${i.nombre}${i.color ? ` (${i.color})` : ""} — ${pesos(i.precio * i.cantidad)}`),
    "",
    `Subtotal: ${pesos(pedido.subtotal)}`,
    ...(pedido.descuento > 0 ? [`Descuento${pedido.cuponCodigo ? ` (${pedido.cuponCodigo})` : ""}: -${pesos(pedido.descuento)}`] : []),
    `Envío: ${pedido.envio > 0 ? pesos(pedido.envio) : "Gratis"}`,
    `*Total: ${pesos(pedido.total)}*`,
    "",
    `👤 ${pedido.cliente}`,
    `📱 WhatsApp: ${pedido.telefono}`,
    `✉️ ${pedido.email}`,
    `🪪 DNI: ${pedido.dni}`,
    dom
      ? `📦 Envío a: ${pedido.calle} ${pedido.altura}${pedido.piso ? `, ${pedido.piso}` : ""}, ${pedido.ciudad}, ${pedido.provincia} (${pedido.codigoPostal})`
      : `🏬 Retira en el local (${tienda().direccion})`,
  ];
  if (pedido.facturacion === "facturaA") lineas.push(`🧾 Factura A — ${pedido.razonSocial} (CUIT ${pedido.cuit})`);
  if (pedido.notas) lineas.push(`📝 ${pedido.notas}`);
  lineas.push("", "Falta coordinar el pago y la entrega con el cliente.");
  return lineas.join("\n");
}

async function pedir(url, opciones) {
  const respuesta = await fetch(url, { ...opciones, signal: AbortSignal.timeout(15000) });
  const cuerpo = await respuesta.text();
  if (!respuesta.ok) throw new Error(`${respuesta.status} ${cuerpo.slice(0, 200)}`);
  return cuerpo;
}

// Manda el pedido al WhatsApp del local. Nunca lanza: si falla, el pedido igual queda guardado.
async function enviarPedido(pedido) {
  const m = modo();
  if (m === "desactivado") {
    console.log(`📲 [WhatsApp sin configurar] Pedido #${pedido.numero} guardado; no se envió al local.`);
    return { ok: false, motivo: "desactivado" };
  }
  const texto = textoPedido(pedido);
  try {
    if (m === "callmebot") {
      const q = new URLSearchParams({ phone: destino(), text: texto, apikey: process.env.CALLMEBOT_APIKEY });
      const r = await pedir(`https://api.callmebot.com/whatsapp.php?${q}`, { method: "GET" });
      if (/error/i.test(r)) throw new Error(r.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 200));
    } else {
      const base = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_VERSION || "v21.0"}/${process.env.WHATSAPP_CLOUD_PHONE_ID}/messages`;
      const plantilla = process.env.WHATSAPP_CLOUD_TEMPLATE;
      const mensaje = plantilla
        ? {
            type: "template",
            template: {
              name: plantilla,
              language: { code: process.env.WHATSAPP_CLOUD_TEMPLATE_LANG || "es_AR" },
              components: [{ type: "body", parameters: [{ type: "text", text: texto.replace(/\s*\n+\s*/g, " | ") }] }],
            },
          }
        : { type: "text", text: { body: texto } };
      await pedir(base, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: destino(), ...mensaje }),
      });
    }
    console.log(`📲 Pedido #${pedido.numero} enviado al WhatsApp del local (${m}).`);
    return { ok: true };
  } catch (error) {
    console.error(`📲 No se pudo enviar el pedido #${pedido.numero} por WhatsApp:`, error.message);
    return { ok: false, motivo: error.message };
  }
}

// Link para que el cliente le escriba al local con el detalle ya armado (sirve de respaldo).
function linkCliente(pedido) {
  const numero = digitos(tienda().whatsapp);
  if (!numero) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(`Hola! Hice el pedido #${pedido.numero} en la web. Quedo atento para coordinar.`)}`;
}

module.exports = { modo, enviarPedido, textoPedido, linkCliente };
