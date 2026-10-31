module.exports = (sequelize, DataTypes) => {
  const dinero = () => ({ type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });

  // Pedido armado en la web y mandado por WhatsApp al local; el dueño lo marca como vendido o cancelado.
  const Pedido = sequelize.define(
    "Pedido",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      cliente: { type: DataTypes.STRING(90), allowNull: false },
      telefono: { type: DataTypes.STRING(20), allowNull: false },
      entrega: { type: DataTypes.ENUM("retiro", "domicilio"), allowNull: false, defaultValue: "retiro" },
      cuponCodigo: DataTypes.STRING(30),
      estado: { type: DataTypes.ENUM("pendiente", "vendido", "cancelado"), allowNull: false, defaultValue: "pendiente" },
      vendidoEn: DataTypes.DATE,
      subtotal: dinero(),
      descuento: dinero(),
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

  Pedido.ESTADOS = ["pendiente", "vendido", "cancelado"];

  Pedido.associate = (db) => {
    Pedido.hasMany(db.PedidoItem, { as: "items", foreignKey: "pedidoId" });
  };

  return Pedido;
};
