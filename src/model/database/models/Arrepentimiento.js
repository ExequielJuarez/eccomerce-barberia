module.exports = (sequelize, DataTypes) => {
  const Arrepentimiento = sequelize.define(
    "Arrepentimiento",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      usuarioId: DataTypes.INTEGER.UNSIGNED,
      pedidoId: DataTypes.INTEGER.UNSIGNED,
      numeroPedido: { type: DataTypes.STRING(20), allowNull: false },
      nombre: { type: DataTypes.STRING(90), allowNull: false },
      email: { type: DataTypes.STRING(120), allowNull: false },
      telefono: DataTypes.STRING(20),
      motivo: DataTypes.STRING(500),
      estado: { type: DataTypes.ENUM("recibida", "resuelta"), allowNull: false, defaultValue: "recibida" },
      resueltaEn: DataTypes.DATE,
    },
    { tableName: "arrepentimientos", updatedAt: false }
  );

  Arrepentimiento.associate = (db) => {
    Arrepentimiento.belongsTo(db.Pedido, { as: "pedido", foreignKey: "pedidoId", constraints: false });
  };

  return Arrepentimiento;
};
