module.exports = (sequelize, DataTypes) => {
  const Notificacion = sequelize.define(
    "Notificacion",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      tipo: { type: DataTypes.ENUM("pedido", "stock"), allowNull: false, defaultValue: "pedido" },
      titulo: { type: DataTypes.STRING(120), allowNull: false },
      mensaje: DataTypes.STRING(255),
      url: DataTypes.STRING(255),
      pedidoId: DataTypes.INTEGER.UNSIGNED,
      productoId: DataTypes.INTEGER.UNSIGNED,
      usuarioId: DataTypes.INTEGER.UNSIGNED,
      leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: "notificaciones", updatedAt: false }
  );

  Notificacion.associate = (db) => {
    Notificacion.belongsTo(db.Pedido, { as: "pedido", foreignKey: "pedidoId" });
    Notificacion.belongsTo(db.Producto, { as: "producto", foreignKey: "productoId" });
  };

  return Notificacion;
};
