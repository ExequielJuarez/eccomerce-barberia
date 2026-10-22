const { body } = require("express-validator");
const usuarios = require("../services/usuarioService");

module.exports = [
  body("nombre").trim().isLength({ min: 2, max: 40 }).withMessage("Ingresá tu nombre"),
  body("apellido").trim().isLength({ min: 2, max: 40 }).withMessage("Ingresá tu apellido"),
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Ingresá un email válido")
    .bail()
    .custom(async (email) => {
      if (await usuarios.buscarPorEmail(email)) throw new Error("Ya existe una cuenta con este email");
      return true;
    }),
  body("telefono")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^[0-9+\s()-]{8,20}$/)
    .withMessage("Ingresá un teléfono válido (con código de área)"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña necesita al menos 8 caracteres")
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage("La contraseña necesita al menos una letra")
    .bail()
    .matches(/\d/)
    .withMessage("La contraseña necesita al menos un número"),
  body("confirmar")
    .custom((valor, { req }) => valor === req.body.password)
    .withMessage("Las contraseñas no coinciden"),
  body("terminos").equals("1").withMessage("Tenés que aceptar los términos y condiciones"),
];
