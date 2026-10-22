const { body } = require("express-validator");
const productoService = require("../services/productoService");
const db = require("../model/database/models");

module.exports = [
  body("nombre").trim().isLength({ min: 3, max: 90 }).withMessage("El nombre debe tener entre 3 y 90 caracteres"),
  body("categoria")
    .custom(async (valor) => (await productoService.categorias()).includes(valor) || Promise.reject())
    .withMessage("Elegí una categoría"),

  body("subcategoria")
    .optional({ values: "falsy" })
    .custom(async (valor, { req }) => {
      const sub = await db.Subcategoria.findByPk(Number(valor) || 0, { include: [{ association: "categoria" }] });
      return (sub && sub.categoria?.nombre === req.body.categoria) || Promise.reject();
    })
    .withMessage("Esa subcategoría no es de la categoría elegida"),

  body("colores")
    .custom(async (valor) => {
      const elegidos = productoService.listaDeColores(valor);
      const existentes = (await productoService.colores()).map((c) => c.valor);
      return (elegidos.length > 0 && elegidos.every((v) => existentes.includes(v))) || Promise.reject();
    })
    .withMessage("Elegí al menos un color"),
  body("precio").isFloat({ min: 1 }).withMessage("Ingresá un precio mayor a 0"),
  body("costo")
    .isFloat({ min: 0 })
    .withMessage("Ingresá el costo (0 o más)")
    .bail()
    .custom((costo, { req }) => Number(costo) <= Number(req.body.precio))
    .withMessage("El costo no puede ser mayor que el precio"),
  body("stock").isInt({ min: 0, max: 99999 }).withMessage("El stock debe ser un número entero (0 o más)"),
  body("etiqueta").optional({ values: "falsy" }).trim().isLength({ max: 24 }).withMessage("Máximo 24 caracteres"),
  body("resumen").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("Máximo 255 caracteres"),
  body("descripcion").optional({ values: "falsy" }).isLength({ max: 4000 }).withMessage("Máximo 4000 caracteres"),
  body("destacados").optional({ values: "falsy" }).isLength({ max: 1000 }).withMessage("Máximo 1000 caracteres"),
];
