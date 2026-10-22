const { Op } = require("sequelize");
const db = require("../model/database/models");

const ESTADOS = db.Pedido.ESTADOS;

const SIN_PAGAR = { medioPago: "tarjeta", estado: "pendiente", pagoEstado: { [Op.ne]: "aprobado" } };
const NO_SIN_PAGAR = { [Op.not]: SIN_PAGAR };

function plano(p) {
  const x = p.get({ plain: true });
  return { ...x, numero: x.id, fecha: x.creado_en, items: x.items || [] };
}

async function listar({ estado = "", q = "", limite } = {}) {
  const where = {};
  if (estado === "sin_pagar") Object.assign(where, SIN_PAGAR);
  else {
    Object.assign(where, NO_SIN_PAGAR);
    if (estado) where.estado = estado;
  }
  const texto = q.trim();
  if (texto) {
    where[Op.or] = [{ cliente: { [Op.like]: `%${texto}%` } }, ...(/^\d+$/.test(texto) ? [{ id: Number(texto) }] : [])];
  }
  const filas = await db.Pedido.findAll({
    where,
    include: [{ association: "items" }],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
    ...(limite ? { limit: limite } : {}),
  });
  return filas.map(plano);
}

async function conteoPorEstado() {
  const filas = await db.Pedido.findAll({
    attributes: ["estado", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "cantidad"]],
    group: ["estado"],
    raw: true,
  });
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  filas.forEach((f) => (conteo[f.estado] = Number(f.cantidad)));
  conteo.sin_pagar = await db.Pedido.count({ where: SIN_PAGAR });
  conteo.pendiente -= conteo.sin_pagar;
  return conteo;
}

async function pendientes() {
  return db.Pedido.count({ where: { estado: ["pendiente", "pagado"], ...NO_SIN_PAGAR } });
}

async function cambiarEstado(id, estado) {
  if (!ESTADOS.includes(estado)) return null;

  return db.sequelize.transaction(async (t) => {

    const pedido = await db.Pedido.findByPk(id, {
      include: [{ association: "items" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!pedido) return null;

    const antes = pedido.estado;
    const cancela = estado === "cancelado" && antes !== "cancelado";
    const reactiva = antes === "cancelado" && estado !== "cancelado";

    const items = pedido.items.filter((i) => i.productoId);
    let stockMovido = 0;

    if (cancela) {
      for (const i of items) {
        await db.sequelize.query("UPDATE productos SET stock = stock + :cantidad WHERE id = :id", {
          replacements: { id: i.productoId, cantidad: i.cantidad },
          transaction: t,
        });
        stockMovido += i.cantidad;
      }
    }

    if (reactiva) {
      for (const i of items) {
        const [, filas] = await db.sequelize.query(
          "UPDATE productos SET stock = stock - :cantidad WHERE id = :id AND stock >= :cantidad",
          { replacements: { id: i.productoId, cantidad: i.cantidad }, transaction: t, type: db.Sequelize.QueryTypes.UPDATE }
        );
        if (!filas) {
          const error = new Error("Sin stock para reactivar");
          error.mensaje = `No hay stock suficiente de "${i.nombre}" para reactivar el pedido`;
          throw error;
        }
        stockMovido -= i.cantidad;
      }
    }

    const cambios = { estado };

    if (["pagado", "enviado", "entregado"].includes(estado) && pedido.pagoEstado !== "aprobado") {
      Object.assign(cambios, {
        pagoEstado: "aprobado",
        pagadoEn: new Date(),
        pagoDetalle: pedido.pagoDetalle || (pedido.medioPago === "transferencia" ? "Transferencia acreditada" : "Pago confirmado a mano"),
      });
    }
    await pedido.update(cambios, { transaction: t });
    return { pedido: plano(pedido), stockMovido };
  });
}

async function crearDesdeCarrito(resumen, datos, usuario) {
  return db.sequelize.transaction(async (t) => {
    for (const i of resumen.items) {

      const [, filas] = await db.sequelize.query(
        "UPDATE productos SET stock = stock - :cantidad WHERE id = :id AND stock >= :cantidad",
        { replacements: { id: i.id, cantidad: i.cantidad }, transaction: t, type: db.Sequelize.QueryTypes.UPDATE }
      );
      if (!filas) {
        const error = new Error(`No hay stock suficiente de "${i.producto.nombre}"`);
        error.sinStock = true;
        throw error;
      }
    }

    const costo = resumen.items.reduce((acc, i) => acc + i.producto.costo * i.cantidad, 0);
    const descuento = resumen.descuentoCupon + resumen.descuentoPago;
    const domicilio = datos.entrega === "domicilio";

    const pedido = await db.Pedido.create(
      {
        usuarioId: usuario?.id || null,
        cliente: `${datos.nombre} ${datos.apellido}`.trim(),
        email: datos.email,
        telefono: datos.telefono,
        dni: datos.dni,
        entrega: datos.entrega,
        calle: domicilio ? datos.calle : null,
        altura: domicilio ? datos.numero : null,
        piso: domicilio ? datos.piso || null : null,
        codigoPostal: domicilio ? datos.codigoPostal : null,
        ciudad: domicilio ? datos.ciudad : null,
        provincia: domicilio ? datos.provincia : null,
        notas: datos.notas || null,
        facturacion: datos.facturacion,
        cuit: datos.facturacion === "facturaA" ? datos.cuit : null,
        razonSocial: datos.facturacion === "facturaA" ? datos.razonSocial : null,
        medioPago: resumen.medioPago,
        cuponCodigo: resumen.cupon?.codigo || null,

        estado: "pendiente",
        pagoEstado: "pendiente",
        subtotal: resumen.subtotal,
        descuento,
        envio: resumen.envio || 0,
        total: resumen.total,
        costo,
        ganancia: resumen.subtotal - descuento - costo,
        items: resumen.items.map((i) => ({
          productoId: i.id,
          nombre: i.producto.nombre,
          color: i.color,
          precio: i.producto.precio,
          costo: i.producto.costo,
          cantidad: i.cantidad,
        })),
      },
      { include: [{ association: "items" }], transaction: t }
    );
    return plano(pedido);
  });
}

async function obtener(id) {
  const pedido = await db.Pedido.findByPk(id, {
    include: [
      {
        association: "items",
        include: [{ association: "producto", attributes: ["id"], include: [{ association: "imagenes", attributes: ["ruta", "orden"] }] }],
      },
    ],
    order: [["items", "id", "ASC"]],
  });
  return pedido ? conImagenes(plano(pedido)) : null;
}

function conImagenes(pedido) {
  pedido.items = pedido.items.map((i) => {
    const fotos = (i.producto?.imagenes || []).slice().sort((a, b) => a.orden - b.orden);
    return { ...i, imagen: fotos[0]?.ruta || null };
  });
  return pedido;
}

async function delUsuario(usuarioId) {
  const filas = await db.Pedido.findAll({
    where: { usuarioId },
    include: [
      {
        association: "items",
        include: [{ association: "producto", attributes: ["id"], include: [{ association: "imagenes", attributes: ["ruta", "orden"] }] }],
      },
    ],
    order: [["creado_en", "DESC"], ["id", "DESC"]],
  });
  return filas.map((f) => conImagenes(plano(f)));
}

async function registrarPago(id, { estado, pagoId = null, detalle = null, fecha = null }) {
  if (!db.Pedido.ESTADOS_PAGO.includes(estado)) return null;

  const resultado = await db.sequelize.transaction(async (t) => {
    const pedido = await db.Pedido.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!pedido) return null;

    if (pedido.pagoEstado === "aprobado" && estado !== "aprobado" && estado !== "reembolsado") {
      return { pedido: plano(pedido), cambio: false };
    }
    const cambio = pedido.pagoEstado !== estado || (pagoId && pedido.pagoId !== String(pagoId));
    await pedido.update(
      {
        pagoEstado: estado,
        pagoId: pagoId ? String(pagoId) : pedido.pagoId,
        pagoDetalle: detalle || pedido.pagoDetalle,
        pagadoEn: estado === "aprobado" ? pedido.pagadoEn || fecha || new Date() : pedido.pagadoEn,

        ...(estado === "aprobado" && pedido.estado === "pendiente" ? { estado: "pagado" } : {}),
      },
      { transaction: t }
    );
    return { pedido: plano(pedido), cambio };
  });
  if (!resultado) return null;

  if (estado === "aprobado" && resultado.pedido.estado === "cancelado") {
    try {
      const r = await cambiarEstado(id, "pagado");
      resultado.pedido = r.pedido;
    } catch (error) {
      resultado.aviso = error.mensaje || "Se pagó un pedido cancelado";
    }
  }
  return resultado;
}

async function vencerImpagos(horas) {
  const limite = new Date(Date.now() - horas * 3600 * 1000);
  const vencidos = await db.Pedido.findAll({
    where: { ...SIN_PAGAR, creado_en: { [Op.lt]: limite } },
    attributes: ["id"],
    raw: true,
  });
  for (const { id } of vencidos) await cambiarEstado(id, "cancelado");
  return vencidos.map((v) => v.id);
}

async function sinPagarRecientes(horas, limite = 30) {
  const desde = new Date(Date.now() - horas * 3600 * 1000);
  const filas = await db.Pedido.findAll({
    where: { ...SIN_PAGAR, creado_en: { [Op.gte]: desde } },
    attributes: ["id"],
    order: [["creado_en", "DESC"]],
    limit: limite,
    raw: true,
  });
  return filas.map((f) => f.id);
}

const inicioDelDia = (fecha) => {
  const f = new Date(fecha);
  f.setHours(0, 0, 0, 0);
  return f;
};

async function metricas(dias = 30) {
  const desde = inicioDelDia(new Date());
  desde.setDate(desde.getDate() - (dias - 1));
  const antesDesde = new Date(desde);
  antesDesde.setDate(desde.getDate() - dias);

  const [validos, anteriores] = await Promise.all([
    db.Pedido.findAll({
      where: { creado_en: { [Op.gte]: desde }, estado: { [Op.ne]: "cancelado" }, ...NO_SIN_PAGAR },
      include: [{ association: "items" }],
    }),
    db.Pedido.findAll({
      where: { creado_en: { [Op.gte]: antesDesde, [Op.lt]: desde }, estado: { [Op.ne]: "cancelado" }, ...NO_SIN_PAGAR },
      attributes: ["ganancia"],
      raw: true,
    }),
  ]);
  const pedidos = validos.map(plano);

  const serie = Array.from({ length: dias }, (_, d) => {
    const fecha = new Date(desde);
    fecha.setDate(desde.getDate() + d);
    return { fecha, ingresos: 0, costo: 0, ganancia: 0, pedidos: 0 };
  });
  pedidos.forEach((p) => {
    const dia = serie[Math.round((inicioDelDia(p.fecha) - desde) / 86400000)];
    if (!dia) return;
    dia.ingresos += p.subtotal - p.descuento;
    dia.costo += p.costo;
    dia.ganancia += p.ganancia;
    dia.pedidos += 1;
  });

  const porProducto = {};
  pedidos.forEach((p) =>
    p.items.forEach((i) => {
      const clave = i.productoId || `borrado-${i.nombre}`;
      const fila = (porProducto[clave] ||= { id: i.productoId, nombre: i.nombre, unidades: 0, ingresos: 0, ganancia: 0 });
      fila.unidades += i.cantidad;
      fila.ingresos += i.precio * i.cantidad;
      fila.ganancia += (i.precio - i.costo) * i.cantidad;
    })
  );

  const ingresos = serie.reduce((acc, d) => acc + d.ingresos, 0);
  const ganancia = serie.reduce((acc, d) => acc + d.ganancia, 0);
  const unidades = pedidos.reduce((acc, p) => acc + p.items.reduce((a, i) => a + i.cantidad, 0), 0);

  return {
    dias,
    ingresos,
    costo: ingresos - ganancia,
    ganancia,
    margen: ingresos ? ganancia / ingresos : 0,
    pedidos: pedidos.length,
    unidades,
    ticketPromedio: pedidos.length ? ingresos / pedidos.length : 0,
    gananciaAnterior: anteriores.length ? anteriores.reduce((acc, p) => acc + Number(p.ganancia), 0) : null,
    serie,
    topProductos: Object.values(porProducto).sort((a, b) => b.ganancia - a.ganancia).slice(0, 5),
    pendientes: await pendientes(),
  };
}

async function ventasDeProducto(id) {
  const filas = await db.PedidoItem.findAll({
    where: { productoId: id },
    include: [{ association: "pedido", attributes: ["id", "creado_en", "estado"], where: { estado: { [Op.ne]: "cancelado" }, ...NO_SIN_PAGAR } }],
    order: [[{ model: db.Pedido, as: "pedido" }, "creado_en", "DESC"]],
  });
  const ventas = filas.map((f) => {
    const x = f.get({ plain: true });
    return { ...x, numero: x.pedido.id, fecha: x.pedido.creado_en };
  });
  return {
    unidades: ventas.reduce((acc, v) => acc + v.cantidad, 0),
    ingresos: ventas.reduce((acc, v) => acc + v.precio * v.cantidad, 0),
    ganancia: ventas.reduce((acc, v) => acc + (v.precio - v.costo) * v.cantidad, 0),
    ultimas: ventas.slice(0, 6),
  };
}

module.exports = {
  ESTADOS,
  listar,
  conteoPorEstado,
  pendientes,
  cambiarEstado,
  crearDesdeCarrito,
  obtener,
  delUsuario,
  registrarPago,
  vencerImpagos,
  sinPagarRecientes,
  metricas,
  ventasDeProducto,
};
