function limpiarWhatsapp(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  return digitos ? `https://wa.me/${digitos}` : "";
}

module.exports = function datosTienda() {
  const e = process.env;
  return {
    nombre: "Barba Black",
    rubro: "Barber Shop · Insumos de peluquería y barbería",
    usuario: e.TIENDA_USUARIO || "",
    razonSocial: e.TIENDA_RAZON_SOCIAL || "",
    cuit: e.TIENDA_CUIT || "",
    direccion: e.TIENDA_DIRECCION || "Av. Leopoldo Lugones 5147 y San Ramón Nonato 5708",
    telefono: e.TIENDA_TELEFONO || "",
    email: e.TIENDA_EMAIL || "",
    whatsapp: limpiarWhatsapp(e.TIENDA_WHATSAPP),
    instagram: e.TIENDA_INSTAGRAM || "",
    mapa: e.TIENDA_MAPA_URL || `https://www.google.com/maps/search/${encodeURIComponent(e.TIENDA_DIRECCION || "Av. Leopoldo Lugones 5147 y San Ramón Nonato 5708")}`,
    horarios: e.TIENDA_HORARIOS || "",
    facebook: e.TIENDA_FACEBOOK || "",
    tiktok: e.TIENDA_TIKTOK || "",
    dataFiscal: e.TIENDA_DATA_FISCAL_URL || "",
    web: (e.APP_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
  };
};
