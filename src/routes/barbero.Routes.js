const express = require("express");
const router = express.Router();

const soloBarbero = require("../middlewares/soloBarbero");
const barbero = require("../controllers/barberoController");
const notificaciones = require("../controllers/notificacionesController").paraUsuario();

router.use(soloBarbero);

router.get("/", barbero.agenda);
router.get("/eventos", barbero.eventos);
router.get("/turnos/nuevo", barbero.nuevo);
router.get("/disponibilidad", barbero.disponibilidad);
router.post("/turnos", barbero.crear);
router.patch("/turnos/:id/estado", barbero.cambiarEstado);

router.get("/notificaciones", notificaciones.listar);
router.post("/notificaciones/leidas", notificaciones.marcarLeidas);
router.get("/notificaciones/stream", notificaciones.stream);

module.exports = router;
