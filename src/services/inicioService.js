const fs = require("fs/promises");
const path = require("path");
const db = require("../model/database/models");
const { SECCIONES } = require("../data/inicioEditable");

const CARPETA_SUBIDAS = path.join(__dirname, "../../public/img/inicio/subidas");
const RUTA_SUBIDAS = "/img/inicio/subidas/";

const PREFIJO_PREVIA = "/img/inicio/__previa__/";

const escapar = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const textoRico = (t) => escapar(t).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
const sinMarcas = (t) => String(t ?? "").replace(/\*/g, "");

const LINK_VALIDO = /^(\/(?!\/)|#|https?:\/\/[^\s]+$|mailto:|tel:)/i;

function limpiarTexto(valor, def) {
  let t = String(valor ?? "").replace(/\r\n?/g, "\n");
  if (def.tipo === "texto" || def.tipo === "link") t = t.replace(/\s*\n\s*/g, " ");
  if (def.tipo === "lineas") {
    t = t
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, def.maxLineas || 10)
      .join("\n");
  }
  return t.trim().slice(0, def.max || 255);
}

function imagenValida(ruta, { previa = false } = {}) {
  if (typeof ruta !== "string" || !ruta.startsWith("/img/inicio/") || ruta.includes("..") || /[\s"'<>\\]/.test(ruta)) return false;
  if (ruta.startsWith(PREFIJO_PREVIA)) return previa;
  return true;
}

function limpiarCampos(campos, entrada, defectos, ctx, ruta) {
  const salida = {};
  const origen = entrada && typeof entrada === "object" ? entrada : {};

  for (const [clave, def] of Object.entries(campos)) {
    const aqui = ruta ? `${ruta}.${clave}` : clave;
    const defecto = defectos && clave in defectos ? defectos[clave] : def.defecto;
    const valor = origen[clave];

    switch (def.tipo) {
      case "texto":
      case "lineas":
      case "parrafo":
        salida[clave] = valor === undefined ? defecto ?? "" : limpiarTexto(valor, def);
        break;

      case "numero": {
        const n = Math.round(Number(String(valor ?? "").replace(/\./g, "").replace(",", ".")));
        salida[clave] = valor === undefined || valor === "" || !Number.isFinite(n) ? defecto ?? 0 : Math.min(Math.max(n, 0), def.max || 9999999);
        break;
      }

      case "link": {
        if (valor === undefined) {
          salida[clave] = defecto ?? "";
          break;
        }
        const link = limpiarTexto(valor, def);
        if (link && !LINK_VALIDO.test(link) && !/^javascript:/i.test(link) && /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(link)) {

          salida[clave] = `https://${link}`;
        } else if (link && !LINK_VALIDO.test(link)) {
          if (ctx.estricto) ctx.errores[aqui] = "Link inválido: empezá con /, # o https://";
          salida[clave] = defecto ?? "";
        } else {
          salida[clave] = link;
        }
        break;
      }

      case "imagen":
        if (ctx.archivos[aqui]) salida[clave] = ctx.archivos[aqui];
        else salida[clave] = imagenValida(valor, ctx) ? valor : defecto ?? "";
        break;

      case "opciones":
        salida[clave] = valor in def.opciones ? valor : defecto ?? Object.keys(def.opciones)[0];
        break;

      case "lista": {

        const items = Array.isArray(valor) ? valor.filter(Boolean) : valor && typeof valor === "object" ? Object.values(valor) : null;
        const defectosLista = Array.isArray(defecto) ? defecto : [];

        if (def.cantidad) {
          salida[clave] = Array.from({ length: def.cantidad }, (_, i) =>
            limpiarCampos(def.campos, items ? items[i] : undefined, defectosLista[i] || {}, ctx, `${aqui}.${i}`)
          );
        } else {
          const lista = (items || defectosLista).slice(0, def.max || 10).map((item, i) => limpiarCampos(def.campos, item, items ? {} : item, ctx, `${aqui}.${i}`));

          const conDatos = lista.filter((item) => Object.values(item).some((v) => String(v).trim()));
          salida[clave] = conDatos.length >= (def.min || 0) ? conDatos : defectosLista.slice(0, def.max || 10);
          if (ctx.estricto && conDatos.length < (def.min || 0)) ctx.errores[aqui] = `Tiene que haber al menos ${def.min}`;
        }
        break;
      }
    }
  }
  return salida;
}

function limpiar(entrada = {}, { archivos = {}, estricto = false, previa = false } = {}) {
  const ctx = { archivos, estricto, previa, errores: {} };
  const contenido = {};
  for (const [id, seccion] of Object.entries(SECCIONES)) {
    const datos = entrada[id] && typeof entrada[id] === "object" ? entrada[id] : undefined;
    contenido[id] = limpiarCampos(seccion.campos, datos, {}, ctx, id);

    let visible = datos ? datos.visible : undefined;
    if (Array.isArray(visible)) visible = visible.includes("1") ? "1" : "0";
    contenido[id].visible = seccion.siempreVisible || visible === undefined ? true : visible === true || visible === "1";
  }
  return { contenido, errores: ctx.errores };
}

function imagenesDe(objeto, lista = new Set()) {
  if (typeof objeto === "string" && objeto.startsWith(RUTA_SUBIDAS)) lista.add(objeto);
  else if (objeto && typeof objeto === "object") Object.values(objeto).forEach((v) => imagenesDe(v, lista));
  return lista;
}

async function borrarSinUso(enUso) {
  let archivos = [];
  try {
    archivos = await fs.readdir(CARPETA_SUBIDAS);
  } catch {
    return;
  }
  await Promise.all(
    archivos
      .filter((a) => a.startsWith("inicio-") && !enUso.has(RUTA_SUBIDAS + a))
      .map((a) => fs.unlink(path.join(CARPETA_SUBIDAS, a)).catch(() => {}))
  );
}

module.exports = {
  SECCIONES,
  PREFIJO_PREVIA,
  textoRico,
  sinMarcas,
  limpiar,

  async obtener() {
    try {
      const fila = await db.ContenidoInicio.findByPk(1);
      return limpiar(fila ? fila.datos : {}).contenido;
    } catch (error) {
      console.error("No se pudo leer el contenido del inicio:", error.message);
      return limpiar({}).contenido;
    }
  },

  async ultimaEdicion() {
    const fila = await db.ContenidoInicio.findByPk(1, {
      attributes: ["actualizado_en", "usuarioId"],
      include: [{ association: "editor", attributes: ["nombre", "apellido"] }],
    });
    if (!fila) return null;
    return { fecha: fila.actualizado_en, editor: fila.editor ? `${fila.editor.nombre} ${fila.editor.apellido}`.trim() : null };
  },

  async guardar(contenido, usuarioId) {
    await db.ContenidoInicio.upsert({ id: 1, datos: contenido, usuarioId });
    await borrarSinUso(imagenesDe(contenido));
  },

  async restablecer() {
    await db.ContenidoInicio.destroy({ where: { id: 1 } });
    await borrarSinUso(new Set());
  },

  async descartarSubidas(rutas) {
    await Promise.all(rutas.map((r) => fs.unlink(path.join(CARPETA_SUBIDAS, path.basename(r))).catch(() => {})));
  },
};
