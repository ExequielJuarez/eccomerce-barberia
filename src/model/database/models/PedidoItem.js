module.exports = (sequelize, DataTypes) => {
  const PedidoItem = sequelize.define(
    "PedidoItem",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      pedidoId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      productoId: DataTypes.INTEGER.UNSIGNED,
      nombre: { type: DataTypes.STRING(90), allowNull: false },
      color: DataTypes.STRING(40),
      precio: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      costo: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cantidad: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, validate: { min: 1 } },
    },
    { tableName: "pedido_items", timestamps: false }
  );

  PedidoItem.associate = (db) => {
    PedidoItem.belongsTo(db.Pedido, { as: "pedido", foreignKey: "pedidoId" });
    PedidoItem.belongsTo(db.Producto, { as: "producto", foreignKey: "productoId" });
  };

  return PedidoItem;
};
