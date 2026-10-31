const FONDOS = { oscuro: "Oscuro", medio: "Gris", claro: "Claro" };

const texto = (etiqueta, defecto, max = 80, extra = {}) => ({ tipo: "texto", etiqueta, defecto, max, ...extra });
const parrafo = (etiqueta, defecto, max = 300, extra = {}) => ({ tipo: "parrafo", etiqueta, defecto, max, ...extra });
const link = (etiqueta, defecto, extra = {}) => ({ tipo: "link", etiqueta, defecto, max: 255, ancho: "medio", ...extra });
const imagen = (etiqueta, defecto, extra = {}) => ({ tipo: "imagen", etiqueta, defecto, ...extra });
const etiquetaSeccion = (defecto) => texto("Texto chico de arriba", defecto, 40);
const tituloSeccion = (defecto) =>
  texto("Título", defecto, 70, { ayuda: "Poné *entre asteriscos* la parte que queda resaltada." });

const SECCIONES = {
  portada: {
    titulo: "Portada",
    descripcion: "Lo primero que se ve al entrar: título, botones y el collage de fotos.",
    siempreVisible: true,
    campos: {
      etiqueta: texto("Texto chico de arriba", "Barber Shop", 70),
      titulo: {
        tipo: "lineas",
        etiqueta: "Título grande",
        defecto: "Barba\n*Black*",
        max: 60,
        maxLineas: 3,
        ayuda: "Cada renglón entra con una animación. *Entre asteriscos* queda resaltado.",
      },
      bajada: parrafo(
        "Texto debajo del título",
        "Insumos profesionales para barberías y peluquerías. Máquinas, tijeras y todo para el barbero de verdad.",
        220
      ),
      botonTexto: texto("Botón principal", "Ver la tienda", 30, { ancho: "medio" }),
      botonLink: link("Link del botón principal", "#categorias"),
      secundarioTexto: texto("Botón secundario", "Visitar el local", 30, { ancho: "medio" }),
      secundarioLink: link("A dónde lleva", "#local"),
    },
  },

  cinta: {
    titulo: "Cinta en movimiento",
    descripcion: "La franja con palabras que se desplazan debajo de la portada.",
    campos: {
      palabras: {
        tipo: "lineas",
        etiqueta: "Palabras",
        defecto: "Clippers\n*Shavers*\nTijeras\n*Insumos*\nPedidos por WhatsApp\n*Envíos a todo el país*",
        max: 240,
        maxLineas: 10,
        ayuda: "Una por renglón. *Entre asteriscos* va resaltada.",
      },
    },
  },

  categorias: {
    titulo: "Categorías",
    descripcion: "Los botones de las categorías se arman solos con las categorías del catálogo.",
    campos: {
      etiqueta: etiquetaSeccion("Comprá por categoría"),
      titulo: tituloSeccion("Todo para *trabajar*"),
    },
  },

  nuevos: {
    titulo: "Nuevos ingresos",
    descripcion: "Fila de productos recién cargados (se arma sola con el catálogo).",
    campos: {
      etiqueta: etiquetaSeccion("Recién llegado"),
      titulo: tituloSeccion("Nuevos *ingresos*"),
      cantidad: { tipo: "numero", etiqueta: "Cuántos mostrar", defecto: 4, max: 8, ancho: "medio" },
      linkTexto: texto("Texto del link", "Ver todo el catálogo", 30, { ancho: "medio" }),
      linkUrl: link("A dónde lleva", "/categoria/clippers"),
    },
  },


  local: {
    titulo: "El local",
    descripcion: "Dirección, contacto y mapa.",
    campos: {
      etiqueta: etiquetaSeccion("Visitanos"),
      titulo: tituloSeccion("Pasá por *La Plata 212*"),
      bajada: parrafo("Texto", "Mirá las máquinas en persona, consultá lo que necesites o pasá a retirar tu pedido.", 200),
      direccion: texto("Dirección", "La Plata 212", 60, { ancho: "medio" }),
      horarios: texto("Horarios", "Consultanos por WhatsApp", 60, { ancho: "medio" }),
      botonTexto: texto("Botón", "Cómo llegar", 30, { ancho: "medio" }),
      botonLink: link("Link del mapa", "https://www.google.com/maps/search/La+Plata+212"),
      imagen: imagen("Foto del local", "/img/inicio/mapa-local.webp", { ayuda: "Mejor una foto vertical." }),
    },
  },

};

module.exports = { SECCIONES, FONDOS };
