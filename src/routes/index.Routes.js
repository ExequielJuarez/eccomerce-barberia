const express = require("express");
const router = express.Router();

const productoService = require("../services/productoService");
const inicioService = require("../services/inicioService");
const categoriaService = require("../services/categoriaService");
const carritoController = require("../controllers/carritoController");
const checkoutController = require("../controllers/checkoutController");
const checkoutValidator = require("../validations/checkoutValidator");
const usuarioController = require("../controllers/usuarioController");
const loginValidator = require("../validations/loginValidator");
const registroValidator = require("../validations/registroValidator");
const soloInvitados = require("../middlewares/soloInvitados");
const favoritosController = require("../controllers/favoritosController");
const pagosController = require("../controllers/pagosController");
const cuentaController = require("../controllers/cuentaController");
const soloLogueados = require("../middlewares/soloLogueados");
const legal = require("../controllers/legalController");
const turnosController = require("../controllers/turnosController");
const perfilValidator = require("../validations/perfilValidator");
const claveValidator = require("../validations/claveValidator");

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

router.get("/turnos", turnosController.ver);
router.get("/turnos/disponibilidad", turnosController.disponibilidad);
router.post("/turnos", turnosController.crear);
router.get("/turnos/:codigo", turnosController.detalle);
router.post("/turnos/:codigo/cancelar", turnosController.cancelar);

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
router.post("/carrito/medio-pago", carritoController.medioPago);
router.post("/carrito/envio", carritoController.envio);
router.post("/carrito/entrega", carritoController.entrega);

router.get("/favoritos", favoritosController.ver);
router.post("/favoritos/:id", favoritosController.alternar);
router.delete("/favoritos", favoritosController.vaciar);

router.get("/checkout/datos", checkoutController.ver);
router.post("/checkout/datos", checkoutValidator, checkoutController.guardar);
router.get("/checkout/pago", checkoutController.verPago);
router.post("/checkout/confirmar", checkoutController.confirmar);

router.get("/pedido/:numero", pagosController.detalle);
router.post("/pedido/:numero/pagar", pagosController.pagar);
router.post("/pedido/:numero/cancelar", pagosController.cancelar);
router.get("/pagos/retorno", pagosController.retorno);
router.post("/pagos/webhook", pagosController.webhook);
router.get("/pagos/demo/:numero", pagosController.verDemo);
router.post("/pagos/demo/:numero", pagosController.confirmarDemo);

router.get("/mi-cuenta", soloLogueados, (req, res) => res.redirect("/mi-cuenta/pedidos"));
router.get("/mi-cuenta/pedidos", soloLogueados, cuentaController.pedidos);
router.get("/mi-cuenta/datos", soloLogueados, cuentaController.verDatos);
router.post("/mi-cuenta/datos", soloLogueados, perfilValidator, cuentaController.guardarDatos);
router.post("/mi-cuenta/clave", soloLogueados, claveValidator, cuentaController.cambiarClave);

router.get("/terminos", legal.pagina("terminos"));
router.get("/privacidad", legal.pagina("privacidad"));
router.get("/cookies", legal.pagina("cookies"));
router.get("/cambios-y-devoluciones", legal.pagina("cambios"));

router.get("/arrepentimiento", legal.verArrepentimiento);
router.post("/arrepentimiento", legal.enviarArrepentimiento);

router.get("/login", soloInvitados, usuarioController.verLogin);
router.post("/login", soloInvitados, loginValidator, usuarioController.login);
router.post("/logout", usuarioController.logout);
router.get("/registro", soloInvitados, usuarioController.verRegistro);
router.post("/registro", soloInvitados, registroValidator, usuarioController.registrar);

router.get("/login/codigo", soloInvitados, usuarioController.verPedirCodigo);
router.post("/login/codigo", soloInvitados, usuarioController.pedirCodigo);
router.get("/verificar", soloInvitados, usuarioController.verVerificar);
router.post("/verificar", soloInvitados, usuarioController.confirmarCodigo);
router.post("/verificar/reenviar", soloInvitados, usuarioController.reenviarCodigo);

router.get("/auth/google", soloInvitados, usuarioController.googleInicio);
router.get("/auth/google/callback", usuarioController.googleCallback);
router.get("/auth/google/demo", soloInvitados, usuarioController.googleDemo);
router.post("/auth/google/demo", soloInvitados, usuarioController.googleDemoConfirmar);

module.exports = router;
