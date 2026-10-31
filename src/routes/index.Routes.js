const express = require("express");
const router = express.Router();

const productoService = require("../services/productoService");
const inicioService = require("../services/inicioService");
const categoriaService = require("../services/categoriaService");
const carritoController = require("../controllers/carritoController");
const checkoutController = require("../controllers/checkoutController");
const checkoutValidator = require("../validations/checkoutValidator");
const favoritosController = require("../controllers/favoritosController");
const pagosController = require("../controllers/pagosController");
const legal = require("../controllers/legalController");
const limites = require("../middlewares/seguridad");

router.get("/", async (req, res) => {
  const contenido = await inicioService.obtener();

  const catalogo = await productoService.listar();
  const nuevos = catalogo
    .filter((p) => p.stock > 0)
    .sort((a, b) => b.id - a.id)
    .slice(0, contenido.nuevos.cantidad || 4);
  res.render("inicio", { titulo: "Insumos de peluquería y barbería", estilo: "inicio", navActivo: "inicio", contenido, nuevos });
});

async function coloresDe(productos) {
  const colores = await productoService.colores();
  return colores
    .map((c) => ({ ...c, cantidad: productos.filter((p) => p.colores.some((x) => x.valor === c.valor)).length }))
    .filter((c) => c.cantidad > 0);
}


router.get("/categoria/:slug", async (req, res, next) => {
  const categoria = await categoriaService.porSlug(req.params.slug);
  if (!categoria) return next();

  const productos = await productoService.listar({ categoriaId: categoria.id });
  const subElegida = categoria.subcategorias.find((s) => s.slug === req.query.sub) || null;

  res.render("catalogo", {
    titulo: categoria.nombre,
    estilo: "catalogo",
    navActivo: categoria.slug,
    modo: "categoria",
    busqueda: "",
    categoria,
    productos,
    colores: await coloresDe(productos),

    grupo: {
      titulo: "Tipo",
      campo: "sub",
      opciones: categoria.subcategorias
        .map((s) => ({
          valor: s.slug,
          nombre: s.nombre,
          cantidad: productos.filter((p) => p.subcategoriaId === s.id).length,
          marcado: subElegida?.id === s.id,
        }))
        .filter((o) => o.cantidad > 0),
    },
    subElegida,
  });
});

router.get("/buscar", async (req, res) => {
  const busqueda = String(req.query.q || "").trim().slice(0, 60);
  if (!busqueda) return res.redirect("/");

  const [productos, menu] = await Promise.all([productoService.listar({ q: busqueda }), categoriaService.menu()]);
  res.render("catalogo", {
    titulo: `Resultados para “${busqueda}”`,
    estilo: "catalogo",
    navActivo: "",
    modo: "busqueda",
    busqueda,
    categoria: null,
    productos,
    colores: await coloresDe(productos),
    grupo: {
      titulo: "Categoría",
      campo: "categoria",
      opciones: menu
        .map((c) => ({ valor: c.nombre, nombre: c.nombre, cantidad: productos.filter((p) => p.categoria === c.nombre).length }))
        .filter((o) => o.cantidad > 0),
    },
    subElegida: null,
  });
});

router.get("/catalogo", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q) return res.redirect(301, `/buscar?q=${encodeURIComponent(q)}`);
  const menu = await categoriaService.menu();
  const pedida = menu.find((c) => c.nombre === req.query.categoria);
  res.redirect(pedida ? 301 : 302, (pedida || menu[0])?.url || "/");
});

router.get("/buscar/sugerencias", async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 60);
  if (q.length < 2) return res.json({ ok: true, total: 0, productos: [] });

  const encontrados = await productoService.listar({ q });
  res.json({
    ok: true,
    total: encontrados.length,
    productos: encontrados.slice(0, 6).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      imagen: p.imagen,
      sinStock: p.stock <= 0,
    })),
  });
});

router.get("/producto/:id", async (req, res) => {
  const producto = await productoService.obtener(req.params.id);
  if (!producto) return res.redirect("/catalogo");

  const [colores, relacionados] = await Promise.all([
    productoService.colores(),
    productoService.relacionados(producto.id),
  ]);
  res.render("producto", {
    titulo: producto.nombre,
    estilo: "producto",
    navActivo: producto.categoriaSlug,
    producto,
    colores,
    relacionados,
  });
});

router.get("/carrito", carritoController.ver);
router.post("/carrito/agregar", carritoController.agregar);
router.patch("/carrito/item/:clave", carritoController.actualizar);
router.delete("/carrito/item/:clave", carritoController.quitar);
router.delete("/carrito", carritoController.vaciar);
router.post("/carrito/cupon", carritoController.cupon);
router.delete("/carrito/cupon", carritoController.quitarCupon);
router.post("/carrito/envio", carritoController.envio);
router.post("/carrito/entrega", carritoController.entrega);

router.get("/favoritos", favoritosController.ver);
router.post("/favoritos/:id", favoritosController.alternar);
router.delete("/favoritos", favoritosController.vaciar);

router.get("/checkout/datos", checkoutController.ver);
router.post("/checkout/datos", limites.pedido, checkoutValidator, checkoutController.guardar);

router.get("/pedido/:numero", pagosController.detalle);
router.post("/pedido/:numero/cancelar", pagosController.cancelar);

router.get("/terminos", legal.pagina("terminos"));
router.get("/privacidad", legal.pagina("privacidad"));
router.get("/cookies", legal.pagina("cookies"));
router.get("/cambios-y-devoluciones", legal.pagina("cambios"));

router.get("/arrepentimiento", legal.verArrepentimiento);
router.post("/arrepentimiento", limites.formulario, legal.enviarArrepentimiento);

module.exports = router;
