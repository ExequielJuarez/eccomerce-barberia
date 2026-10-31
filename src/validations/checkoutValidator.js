const { body } = require("express-validator");

module.exports = [
  body("nombre").trim().isLength({ min: 2, max: 40 }).withMessage("Ingresá tu nombre"),
  body("apellido").trim().isLength({ min: 2, max: 40 }).withMessage("Ingresá tu apellido"),
  body("telefono")
    .trim()
    .matches(/^[0-9+\s()-]{8,20}$/)
    .withMessage("Ingresá un WhatsApp válido (con código de área)"),
  body("entrega").isIn(["retiro", "domicilio"]).withMessage("Elegí si retirás o querés envío"),
];
