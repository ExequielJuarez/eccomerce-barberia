const { body } = require("express-validator");
const usuarios = require("../services/usuarioService");
const provincias = require("../data/provincias");

const cargaDireccion = (valor, { req }) =>
  ["calle", "numero", "codigoPostal", "ciudad", "provincia"].some((c) => String(req.body[c] || "").trim());

module.exports = [
  body("nombre").trim().isLength({ min: 2, max: 40 }).withMessage("Ingresá tu nombre"),
  body("apellido").trim().isLength({ min: 2, max: 40 }).withMessage("Ingresá tu apellido"),
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Ingresá un email válido")
    .bail()
    .custom(async (email, { req }) => {
      const otro = await usuarios.buscarPorEmail(email);
      if (otro && otro.id !== req.session.usuarioLogueado.id) throw new Error("Ya existe otra cuenta con este email");
      return true;
    }),
  body("telefono")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^[0-9+\s()-]{8,20}$/)
    .withMessage("Ingresá un teléfono válido (con código de área)"),
  body("dni")
    .optional({ values: "falsy" })
    .trim()
    .matches(/^\d{7,8}$/)
    .withMessage("El DNI debe tener 7 u 8 números, sin puntos"),

  body("calle").if(cargaDireccion).trim().notEmpty().withMessage("Ingresá la calle"),
  body("numero")
    .if(cargaDireccion)
    .trim()
    .matches(/^(\d{1,6}|S\/N)$/i)
    .withMessage("Ingresá la altura (o S/N)"),
  body("piso").optional({ values: "falsy" }).trim().isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),
  body("codigoPostal")
    .if(cargaDireccion)
    .trim()
    .matches(/^\d{4}$/)
    .withMessage("El código postal tiene 4 números"),
  body("ciudad").if(cargaDireccion).trim().notEmpty().withMessage("Ingresá la ciudad o localidad"),
  body("provincia").if(cargaDireccion).isIn(provincias).withMessage("Elegí una provincia"),
];
