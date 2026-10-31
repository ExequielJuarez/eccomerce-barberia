// Datos del local. Lo cargado desde el panel (tabla `configuracion`) pisa a las variables TIENDA_* del .env.
let guardado = {};

function limpiarWhatsapp(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  return digitos ? `https://wa.me/${digitos}` : "";
}

function datosTienda() {
  const e = process.env;
  const dato = (clave, entorno, defecto = "") => (guardado[clave] !== undefined && guardado[clave] !== "" ? guardado[clave] : entorno || defecto);
  const direccion = dato("direccion", e.TIENDA_DIRECCION, "La Plata 212");
  return {
    nombre: "Barba Black",
    rubro: "Barber Shop · Insumos de peluquería y barbería",
    usuario: dato("usuario", e.TIENDA_USUARIO),
    razonSocial: e.TIENDA_RAZON_SOCIAL || "",
    cuit: e.TIENDA_CUIT || "",
    direccion,
    telefono: dato("telefono", e.TIENDA_TELEFONO),
    email: dato("email", e.TIENDA_EMAIL),
    whatsapp: limpiarWhatsapp(dato("whatsapp", e.TIENDA_WHATSAPP)),
    whatsappNumero: String(dato("whatsapp", e.TIENDA_WHATSAPP)).replace(/\D/g, ""),
    instagram: dato("instagram", e.TIENDA_INSTAGRAM),
    mapa: dato("mapa", e.TIENDA_MAPA_URL, `https://www.google.com/maps/search/${encodeURIComponent(direccion)}`),
    horarios: dato("horarios", e.TIENDA_HORARIOS),
    facebook: dato("facebook", e.TIENDA_FACEBOOK),
    tiktok: dato("tiktok", e.TIENDA_TIKTOK),
    dataFiscal: e.TIENDA_DATA_FISCAL_URL || "",
    web: (e.APP_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
  };
}

datosTienda.cargar = (valores) => {
  guardado = { ...valores };
};
datosTienda.guardado = () => ({ ...guardado });

module.exports = datosTienda;
