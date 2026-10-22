const { body } = require("express-validator");
const provincias = require("../data/provincias");

const esDomicilio = body("entrega").equals("domicilio");
const esFacturaA = body("facturacion").equals("facturaA");

module.exports = [

  body("email").trim().isEmail().withMessage("Ingresá un email válido"),
  body("nombre")
    .trim()
    .isLength({ min: 2, max: 40 })
    .withMessage("Ingresá tu nombre"),
  body("apellido")
    .trim()
    .isLength({ min: 2, max: 40 })
    .withMessage("Ingresá tu apellido"),
  body("telefono")
    .trim()
    .matches(/^[0-9+\s()-]{8,20}$/)
    .withMessage("Ingresá un teléfono válido (con código de área)"),
  body("dni")
    .trim()
    .matches(/^\d{7,8}$/)
    .withMessage("El DNI debe tener 7 u 8 números, sin puntos"),

  body("entrega").isIn(["domicilio", "retiro"]).withMessage("Elegí cómo recibir tu pedido"),
  body("calle").if(esDomicilio).trim().notEmpty().withMessage("Ingresá la calle"),
  body("numero")
    .if(esDomicilio)
    .trim()
    .matches(/^(\d{1,6}|S\/N)$/i)
    .withMessage("Ingresá la altura (o S/N)"),
  body("piso").optional({ values: "falsy" }).trim().isLength({ max: 20 }),
  body("codigoPostal")
    .if(esDomicilio)
    .trim()
    .matches(/^\d{4}$/)
    .withMessage("El código postal tiene 4 números"),
  body("ciudad").if(esDomicilio).trim().notEmpty().withMessage("Ingresá la ciudad o localidad"),
  body("provincia").if(esDomicilio).isIn(provincias).withMessage("Elegí una provincia"),
  body("notas")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Máximo 300 caracteres"),

  body("facturacion").isIn(["consumidor", "facturaA"]).withMessage("Elegí el tipo de factura"),
  body("cuit")
    .if(esFacturaA)
    .trim()
    .matches(/^\d{2}-?\d{8}-?\d$/)
    .withMessage("Ingresá un CUIT válido (11 números)"),
  body("razonSocial").if(esFacturaA).trim().notEmpty().withMessage("Ingresá la razón social"),
];
