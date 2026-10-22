const { body } = require("express-validator");

module.exports = [
  body("nueva")
    .isLength({ min: 8 })
    .withMessage("La contraseña necesita al menos 8 caracteres")
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage("La contraseña necesita al menos una letra")
    .bail()
    .matches(/\d/)
    .withMessage("La contraseña necesita al menos un número"),
  body("confirmar")
    .custom((valor, { req }) => valor === req.body.nueva)
    .withMessage("Las contraseñas no coinciden"),
];
