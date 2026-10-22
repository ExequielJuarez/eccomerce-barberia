const { body } = require("express-validator");

module.exports = [
  body("email").trim().toLowerCase().isEmail().withMessage("Ingresá un email válido"),
  body("password").notEmpty().withMessage("Ingresá tu contraseña"),
];
