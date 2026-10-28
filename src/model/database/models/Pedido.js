module.exports = (sequelize, DataTypes) => {

  const dinero = () => ({ type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });

  const Pedido = sequelize.define(
    "Pedido",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      usuarioId: DataTypes.INTEGER.UNSIGNED,
      cliente: { type: DataTypes.STRING(90), allowNull: false },
      email: DataTypes.STRING(120),
      telefono: DataTypes.STRING(20),
      dni: DataTypes.STRING(8),
      entrega: { type: DataTypes.ENUM("domicilio", "retiro"), allowNull: false, defaultValue: "domicilio" },
      calle: DataTypes.STRING(90),
      altura: DataTypes.STRING(10),
      piso: DataTypes.STRING(20),
      codigoPostal: DataTypes.CHAR(4),
      ciudad: DataTypes.STRING(80),
      provincia: DataTypes.STRING(60),
      notas: DataTypes.STRING(300),
      facturacion: { type: DataTypes.ENUM("consumidor", "facturaA"), allowNull: false, defaultValue: "consumidor" },
      cuit: DataTypes.STRING(13),
      razonSocial: DataTypes.STRING(120),
      medioPago: { type: DataTypes.ENUM("tarjeta", "transferencia", "whatsapp"), allowNull: false, defaultValue: "whatsapp" },
      cuponCodigo: DataTypes.STRING(30),
      estado: {
        type: DataTypes.ENUM("pendiente", "pagado", "enviado", "entregado", "cancelado"),
        allowNull: false,
        defaultValue: "pendiente",
      },

      pagoEstado: {
        type: DataTypes.ENUM("pendiente", "aprobado", "rechazado", "reembolsado"),
        allowNull: false,
        defaultValue: "pendiente",
      },
      pagoId: DataTypes.STRING(40),
      pagoDetalle: DataTypes.STRING(120),
      pagadoEn: DataTypes.DATE,
      subtotal: dinero(),
      descuento: dinero(),
      envio: dinero(),
      total: dinero(),
      costo: dinero(),
      ganancia: dinero(),

      numero: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue("id");
        },
      },
      fecha: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue("creado_en") || this.getDataValue("creadoEn");
        },
      },
    },
    { tableName: "pedidos" }
  );

  Pedido.ESTADOS = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];
  Pedido.ESTADOS_PAGO = ["pendiente", "aprobado", "rechazado", "reembolsado"];

  Pedido.associate = (db) => {
    Pedido.belongsTo(db.Usuario, { as: "usuario", foreignKey: "usuarioId" });
    Pedido.hasMany(db.PedidoItem, { as: "items", foreignKey: "pedidoId" });
  };

  return Pedido;
};
