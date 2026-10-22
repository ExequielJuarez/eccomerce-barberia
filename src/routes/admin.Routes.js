const express = require("express");
const router = express.Router();

const soloAdmin = require("../middlewares/soloAdmin");
const soloSuperAdmin = require("../middlewares/soloSuperAdmin");
const subirImagenes = require("../middlewares/subirImagenes");
const productoValidator = require("../validations/productoValidator");
const admin = require("../controllers/adminController");
const notificaciones = require("../controllers/notificacionesController");
const subirImagenesInicio = require("../middlewares/subirImagenesInicio");
const inicio = require("../controllers/inicioAdminController");
const categorias = require("../controllers/categoriasAdminController");
const arrepentimientos = require("../controllers/arrepentimientosAdminController");
const arrepentimientoService = require("../services/arrepentimientoService");
const turnosAdmin = require("../controllers/turnosAdminController");
const multer = require("multer");

const soloCampos = (req, res, next) =>
  multer({ limits: { fields: 400, fieldSize: 20 * 1024 } }).none()(req, res, (err) =>
    err ? res.status(400).send("No se pudo armar la vista previa") : next()
  );

router.use(soloAdmin);

router.use(async (req, res, next) => {
  res.locals.arrepentimientosPendientes = await arrepentimientoService.pendientes();
  next();
});

router.get("/", admin.dashboard);

router.get("/productos", admin.productos);
router.get("/productos/nuevo", admin.nuevo);
router.post("/productos", subirImagenes, productoValidator, admin.crear);
router.get("/productos/:id", admin.verProducto);
router.get("/productos/:id/editar", admin.editar);
router.put("/productos/:id", subirImagenes, productoValidator, admin.actualizar);
router.delete("/productos/:id", admin.eliminar);
router.patch("/productos/:id/stock", admin.ajustarStock);
router.post("/colores", admin.crearColor);

router.get("/categorias", categorias.ver);
router.post("/categorias", categorias.crearCategoria);
router.patch("/categorias/:id", categorias.renombrarCategoria);
router.patch("/categorias/:id/mover", categorias.moverCategoria);
router.delete("/categorias/:id", categorias.borrarCategoria);
router.post("/categorias/:id/subcategorias", categorias.crearSubcategoria);
router.patch("/subcategorias/:id", categorias.renombrarSubcategoria);
router.delete("/subcategorias/:id", categorias.borrarSubcategoria);

router.get("/arrepentimientos", arrepentimientos.ver);
router.patch("/arrepentimientos/:id", arrepentimientos.cambiarEstado);

router.get("/turnos", turnosAdmin.agenda);
router.get("/turnos/config", turnosAdmin.config);
router.patch("/turnos/:id/estado", turnosAdmin.cambiarEstado);
router.post("/turnos/servicios", turnosAdmin.guardarServicio);
router.put("/turnos/servicios/:id", turnosAdmin.guardarServicio);
router.delete("/turnos/servicios/:id", turnosAdmin.borrarServicio);
router.post("/turnos/equipo", turnosAdmin.guardarBarbero);
router.put("/turnos/equipo/:id", turnosAdmin.guardarBarbero);
router.delete("/turnos/equipo/:id", turnosAdmin.borrarBarbero);
router.put("/turnos/horarios", turnosAdmin.guardarHorarios);
router.post("/turnos/cierres", turnosAdmin.crearBloqueo);
router.delete("/turnos/cierres/:id", turnosAdmin.borrarBloqueo);

router.get("/pedidos", admin.pedidos);
router.patch("/pedidos/:numero/estado", admin.cambiarEstado);
router.get("/pedidos/:numero/comprobante", admin.comprobante);

router.get("/inicio", soloSuperAdmin, inicio.ver);
router.put("/inicio", soloSuperAdmin, subirImagenesInicio, inicio.guardar);
router.post("/inicio/vista-previa", soloSuperAdmin, soloCampos, inicio.vistaPrevia);
router.delete("/inicio", soloSuperAdmin, inicio.restablecer);

router.get("/notificaciones", notificaciones.listar);
router.post("/notificaciones/leidas", notificaciones.marcarLeidas);
router.get("/notificaciones/stream", notificaciones.stream);

module.exports = router;
