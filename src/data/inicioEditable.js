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
        defecto: "La\n*Vecindad*",
        max: 60,
        maxLineas: 3,
        ayuda: "Cada renglón entra con una animación. *Entre asteriscos* queda resaltado.",
      },
      bajada: parrafo(
        "Texto debajo del título",
        "Barbería y peluquería con dos sucursales. Cortes, barba e insumos profesionales para que salgas como querés.",
        220
      ),
      botonTexto: texto("Botón principal", "Ver la tienda", 30, { ancho: "medio" }),
      botonLink: link("Link del botón principal", "#categorias"),
      secundarioTexto: texto("Botón secundario", "Sacar turno", 30, { ancho: "medio" }),
      secundarioLink: link("A dónde lleva", "/turnos"),
    },
  },

  cinta: {
    titulo: "Cinta en movimiento",
    descripcion: "La franja con palabras que se desplazan debajo de la portada.",
    campos: {
      palabras: {
        tipo: "lineas",
        etiqueta: "Palabras",
        defecto: "Clippers\n*Shavers*\nTijeras\n*Insumos*\nTurnos online\n*Envíos a todo el país*",
        max: 240,
        maxLineas: 10,
        ayuda: "Una por renglón. *Entre asteriscos* va resaltada.",
      },
    },
  },

  categorias: {
    titulo: "Categorías",
    descripcion: "Las tarjetas grandes que llevan a cada sección del catálogo.",
    campos: {
      etiqueta: etiquetaSeccion("Comprá por categoría"),
      titulo: tituloSeccion("Todo para *trabajar*"),
      items: {
        tipo: "lista",
        etiqueta: "Tarjetas",
        item: "Categoría",
        cantidad: 4,
        campos: {
          nombre: texto("Nombre", "", 30, { ancho: "medio" }),
          link: link("Link", "", { ayuda: "Ej: /categoria/clippers abre esa sección; /categoria/clippers?sub=wahl, ya filtrada." }),
          frase: parrafo("Frase", "", 90),
          imagen: imagen("Foto", ""),
        },
        defecto: [
          { nombre: "Clippers", link: "/categoria/clippers", frase: "Wahl, Kemei, VGR y Viggo.", imagen: "/img/productos/wahl-magic-clip-1.jpg" },
          { nombre: "Shavers", link: "/categoria/shavers", frase: "Terminaciones al ras.", imagen: "/img/productos/shaver-vgr-1.jpg" },
          { nombre: "Tijeras", link: "/categoria/tijeras", frase: "Combos con estuche.", imagen: "/img/productos/tijeras-viggo-2.jpg" },
          { nombre: "Insumos", link: "/categoria/insumos", frase: "Higiene y sanitizantes.", imagen: "/img/productos/liquido-sanitizante-1.jpg" },
        ],
      },
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


  beneficios: {
    titulo: "Beneficios",
    descripcion: "Cuatro avisos cortos de envío, pago y retiro.",
    campos: {
      items: {
        tipo: "lista",
        etiqueta: "Avisos",
        item: "Aviso",
        cantidad: 4,
        campos: {
          titulo: texto("Título", "", 36),
          texto: parrafo("Texto", "", 110),
        },
        defecto: [
          { titulo: "Envío gratis", texto: "En compras desde $150.000 a todo el país." },
          { titulo: "10% off", texto: "Pagando por transferencia bancaria." },
          { titulo: "Hasta 6 cuotas", texto: "Con tarjeta de crédito, por Mercado Pago." },
          { titulo: "Retiro sin costo", texto: "En nuestras sucursales." },
        ],
      },
    },
  },

  local: {
    titulo: "El local",
    descripcion: "Dirección, contacto y mapa.",
    campos: {
      etiqueta: etiquetaSeccion("Visitanos"),
      titulo: tituloSeccion("Pasá por *nuestras sucursales*"),
      bajada: parrafo("Texto", "Mirá las máquinas en persona, consultá lo que necesites o pasá a retirar tu pedido.", 200),
      direccion: texto("Dirección", "Av. Leopoldo Lugones 5147 y San Ramón Nonato 5708", 60, { ancho: "medio" }),
      horarios: texto("Horarios", "Consultanos por WhatsApp", 60, { ancho: "medio" }),
      botonTexto: texto("Botón", "Cómo llegar", 30, { ancho: "medio" }),
      botonLink: link("Link del mapa", "https://www.google.com/maps/search/La+Plata+212"),
      imagen: imagen("Foto del local", "/img/productos/combo-iniciados-1.jpg", { ayuda: "Mejor una foto vertical." }),
    },
  },

};

module.exports = { SECCIONES, FONDOS };
