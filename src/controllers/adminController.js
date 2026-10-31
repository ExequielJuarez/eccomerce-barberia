const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const productoService = require("../services/productoService");
const whatsapp = require("../services/whatsappService");
const pedidoService = require("../services/pedidoService");
const categoriaService = require("../services/categoriaService");

const CARPETA_PUBLICA = path.join(__dirname, "../../public");

function borrarImagen(ruta) {
  if (!ruta || !ruta.startsWith("/img/productos/")) return;
  fs.unlink(path.join(CARPETA_PUBLICA, ruta), () => {});
}

async function base(req, extra) {
  const [totalProductos, pedidosPendientes] = await Promise.all([productoService.total(), pedidoService.pendientes()]);
  return { usuario: req.session.usuarioLogueado, totalProductos, pedidosPendientes, ...extra };
}

async function renderFormulario(res, req, { producto = null, datos, errores = {}, status = 200 }) {
  const [categorias, colores, categoriasCompletas] = await Promise.all([
    productoService.categorias(),
    productoService.colores(),
    categoriaService.listarCompletas(),
  ]);
  res.status(status).render(
    "admin/producto-form",
    await base(req, {
      titulo: producto ? `Editar · ${producto.nombre}` : "Nuevo producto",
      estilo: ["admin", "admin-producto-form"],
      seccion: "productos",
      producto,
      datos,
      errores,
      categorias,
      categoriasCompletas,
      colores,
      MAX_IMAGENES: productoService.MAX_IMAGENES,
    })
  );
}

function erroresDe(req) {
  const errores = validationResult(req).mapped();
  if (req.errorImagen) errores.imagenes = { msg: req.errorImagen };
  return errores;
}

function imagenesDelFormulario(req) {
  return {
    nuevas: req.files.map((f) => `/img/productos/${f.filename}`),
    quitar: [].concat(req.body.quitarImagenes || []),
    principal: req.body.principal || "",
  };
}

async function validarCantidadImagenes(req, errores, productoId = null) {
  const { nuevas, quitar } = imagenesDelFormulario(req);
  const total = (await productoService.contarImagenes(productoId)) - quitar.length + nuevas.length;
  if (total > productoService.MAX_IMAGENES && !errores.imagenes) {
    errores.imagenes = { msg: `Cada producto puede tener hasta ${productoService.MAX_IMAGENES} imágenes` };
  }
}

const borrarSubidas = (req) => req.files.forEach((f) => borrarImagen(`/img/productos/${f.filename}`));

module.exports = {

  async dashboard(req, res) {
    const dias = [7, 14, 30].includes(Number(req.query.dias)) ? Number(req.query.dias) : 14;
    const [m, stock, ultimos] = await Promise.all([
      pedidoService.metricas(dias),
      productoService.resumenStock(),
      pedidoService.listar({ limite: 6 }),
    ]);
    res.render(
      "admin/dashboard",
      await base(req, {
        titulo: "Panel",
        estilo: ["admin", "admin-dashboard"],
        seccion: "dashboard",
        m,
        stock,
        ultimos,
        STOCK_BAJO: productoService.STOCK_BAJO,
      })
    );
  },

  async productos(req, res) {
    const { q = "", categoria = "", stock = "", orden = "nombre" } = req.query;
    const [lista, categorias, stockResumen] = await Promise.all([
      productoService.listar({ q, categoria, stock, orden }),
      productoService.categorias(),
      productoService.resumenStock(),
    ]);
    res.render(
      "admin/productos",
      await base(req, {
        titulo: "Productos",
        estilo: ["admin", "admin-productos"],
        seccion: "productos",
        lista,
        filtros: { q, categoria, stock, orden },
        categorias,
        stockResumen,
        STOCK_BAJO: productoService.STOCK_BAJO,
      })
    );
  },

  async verProducto(req, res) {
    const producto = await productoService.obtener(req.params.id);
    if (!producto) return res.redirect("/admin/productos");
    res.render(
      "admin/producto",
      await base(req, {
        titulo: producto.nombre,
        estilo: ["admin", "admin-producto"],
        seccion: "productos",
        producto,
        color: producto.colorInfo,
        ventas: await pedidoService.ventasDeProducto(producto.id),
        STOCK_BAJO: productoService.STOCK_BAJO,
      })
    );
  },

  async nuevo(req, res) {
    await renderFormulario(res, req, { datos: { categoria: "", subcategoria: "", colores: [], stock: 0 } });
  },

  async crear(req, res) {
    const errores = erroresDe(req);
    await validarCantidadImagenes(req, errores);
    if (Object.keys(errores).length) {
      borrarSubidas(req);
      return renderFormulario(res, req, { datos: req.body, errores, status: 422 });
    }

    const producto = await productoService.crear(req.body, imagenesDelFormulario(req));
    req.session.flash = `Producto "${producto.nombre}" creado.`;
    res.redirect(`/admin/productos/${producto.id}`);
  },

  async editar(req, res) {
    const producto = await productoService.obtener(req.params.id);
    if (!producto) return res.redirect("/admin/productos");
    await renderFormulario(res, req, {
      producto,
      datos: { ...producto, ...producto.crudo, subcategoria: producto.subcategoriaId || "", colores: producto.colores.map((c) => c.valor) },
    });
  },

  async actualizar(req, res) {
    const producto = await productoService.obtener(req.params.id);
    if (!producto) return res.redirect("/admin/productos");

    const errores = erroresDe(req);
    await validarCantidadImagenes(req, errores, producto.id);
    if (Object.keys(errores).length) {
      borrarSubidas(req);
      return renderFormulario(res, req, { producto, datos: { ...req.body, imagenes: producto.imagenes }, errores, status: 422 });
    }

    const { rutasBorradas } = await productoService.actualizar(producto.id, req.body, imagenesDelFormulario(req));
    rutasBorradas.forEach(borrarImagen);

    req.session.flash = "Cambios guardados.";
    res.redirect(`/admin/productos/${producto.id}`);
  },

  async crearColor(req, res) {
    const nombre = String(req.body.nombre || "").trim();
    if (nombre.length < 2 || nombre.length > 40) {
      return res.status(422).json({ ok: false, mensaje: "Escribí un nombre de color (2 a 40 letras)" });
    }
    const color = await productoService.crearColor({ nombre, hex: req.body.hex });
    if (!color) return res.status(422).json({ ok: false, mensaje: "Ese nombre de color no es válido" });
    res.status(color.nuevo ? 201 : 200).json({ ok: true, color });
  },

  async eliminar(req, res) {
    const producto = await productoService.eliminar(req.params.id);
    if (producto) {
      producto.imagenes.forEach((i) => borrarImagen(i.ruta));
      req.session.flash = `Producto "${producto.nombre}" eliminado.`;
    }
    res.redirect("/admin/productos");
  },

  async ajustarStock(req, res) {
    const { cambio, valor } = req.body;
    let opciones;
    if (valor !== undefined) {
      const nuevo = parseInt(valor, 10);
      if (!Number.isInteger(nuevo) || nuevo < 0) return res.status(400).json({ ok: false, mensaje: "Stock inválido" });
      opciones = { valor: nuevo };
    } else {
      opciones = { cambio: parseInt(cambio, 10) || 0 };
    }

    const stock = await productoService.ajustarStock(req.params.id, opciones);
    if (stock === null) return res.status(404).json({ ok: false, mensaje: "Producto no encontrado" });
    res.json({ ok: true, stock, stockBajo: productoService.STOCK_BAJO, resumen: await productoService.resumenStock() });
  },

  async pedidos(req, res) {
    const { estado = "", q = "" } = req.query;

    const [lista, conteo] = await Promise.all([pedidoService.listar({ estado, q }), pedidoService.conteoPorEstado()]);
    res.render(
      "admin/pedidos",
      await base(req, {
        titulo: "Pedidos",
        estilo: ["admin", "admin-pedidos"],
        seccion: "pedidos",
        lista,
        linkWhatsapp: whatsapp.linkAdmin,
        filtros: { estado, q },
        estados: pedidoService.ESTADOS,
        conteo,

        total: Object.values(conteo).reduce((a, n) => a + n, 0),
      })
    );
  },

  async comprobante(req, res) {
    const numero = Number(req.params.numero);
    const pedido = Number.isInteger(numero) ? await pedidoService.obtener(numero) : null;
    if (!pedido) {
      req.session.flash = "No encontramos ese pedido.";
      return res.redirect("/admin/pedidos");
    }
    res.render("admin/comprobante", {
      titulo: `Comprobante #${pedido.numero}`,
      estilo: "admin-comprobante",
      pedido,

      tienda: require("../helpers/tienda")(),
      emitido: new Date(),
    });
  },

  async cambiarEstado(req, res) {
    let resultado;
    try {
      resultado = await pedidoService.cambiarEstado(req.params.numero, req.body.estado);
    } catch (error) {
      if (!error.mensaje) throw error;
      return res.status(409).json({ ok: false, mensaje: error.mensaje });
    }
    if (!resultado) return res.status(400).json({ ok: false, mensaje: "No se pudo cambiar el estado" });

    const { pedido, stockMovido } = resultado;
    res.json({
      ok: true,
      estado: pedido.estado,
      ganancia: pedido.ganancia,
      stockMovido,
      pendientes: await pedidoService.pendientes(),
    });
  },
};
