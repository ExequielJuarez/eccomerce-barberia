const categorias = require("../services/categoriaService");
const productoService = require("../services/productoService");
const pedidoService = require("../services/pedidoService");
const etiquetas = require("../services/etiquetaService");

const quiereJson = (req) => req.accepts(["html", "json"]) === "json";

function responder(req, res, resultado, mensajeOk, ancla = "") {
  if (quiereJson(req)) {
    return res.status(resultado.ok ? 200 : 422).json(resultado);
  }
  req.session.flash = resultado.ok ? mensajeOk(resultado) : resultado.mensaje;
  res.redirect(`/admin/categorias${ancla}`);
}

module.exports = {
  async ver(req, res) {
    const [lista, listaEtiquetas, totalProductos, pedidosPendientes] = await Promise.all([
      categorias.listarCompletas(),
      etiquetas.listar(),
      productoService.total(),
      pedidoService.pendientes(),
    ]);
    res.render("admin/categorias", {
      titulo: "Categorías",
      estilo: ["admin", "admin-categorias"],
      seccion: "categorias",
      usuario: req.session.usuarioLogueado,
      totalProductos,
      pedidosPendientes,
      lista,
      etiquetas: listaEtiquetas,
    });
  },

  async crearCategoria(req, res) {
    const r = await categorias.crearCategoria(req.body.nombre);
    responder(req, res, r, (x) => `Categoría "${x.categoria.nombre}" creada. Ya aparece en el menú de la tienda.`, r.ok ? `#categoria-${r.categoria.id}` : "");
  },

  async renombrarCategoria(req, res) {
    const r = await categorias.renombrarCategoria(req.params.id, req.body.nombre);
    responder(req, res, r, (x) => `Listo, ahora se llama "${x.categoria.nombre}".`, `#categoria-${req.params.id}`);
  },

  async borrarCategoria(req, res) {
    const r = await categorias.borrarCategoria(req.params.id);
    responder(req, res, r, (x) => `Categoría "${x.categoria.nombre}" eliminada.`);
  },

  async moverCategoria(req, res) {
    const r = await categorias.moverCategoria(req.params.id, req.body.direccion);
    responder(req, res, r, () => "Orden del menú actualizado.", `#categoria-${req.params.id}`);
  },

  async crearEtiqueta(req, res) {
    const r = await etiquetas.crear(req.body.nombre);
    responder(req, res, r, (x) => `Etiqueta "${x.etiqueta.nombre}" creada. Ya la podés elegir al cargar o editar un producto.`, "#etiquetas");
  },

  async renombrarEtiqueta(req, res) {
    const r = await etiquetas.renombrar(req.params.id, req.body.nombre);
    responder(req, res, r, (x) => `Listo, ahora se llama "${x.etiqueta.nombre}".`, "#etiquetas");
  },

  async borrarEtiqueta(req, res) {
    const r = await etiquetas.borrar(req.params.id);
    responder(
      req,
      res,
      r,
      (x) => `Etiqueta "${x.etiqueta.nombre}" eliminada.` + (x.productos ? ` ${x.productos} ${x.productos === 1 ? "producto quedó" : "productos quedaron"} sin etiqueta.` : ""),
      "#etiquetas"
    );
  },

  async crearSubcategoria(req, res) {
    const r = await categorias.crearSubcategoria(req.params.id, req.body.nombre);
    responder(req, res, r, (x) => `Subcategoría "${x.subcategoria.nombre}" agregada a ${x.categoria}.`, `#categoria-${req.params.id}`);
  },

  async renombrarSubcategoria(req, res) {
    const r = await categorias.renombrarSubcategoria(req.params.id, req.body.nombre);
    responder(req, res, r, (x) => `Listo, ahora se llama "${x.subcategoria.nombre}".`, r.ok ? `#categoria-${r.subcategoria.categoriaId}` : "");
  },

  async borrarSubcategoria(req, res) {
    const r = await categorias.borrarSubcategoria(req.params.id);
    responder(
      req,
      res,
      r,
      (x) =>
        `Subcategoría "${x.subcategoria.nombre}" eliminada.` +
        (x.productos ? ` ${x.productos} ${x.productos === 1 ? "producto quedó" : "productos quedaron"} sin subcategoría.` : "")
    );
  },
};
