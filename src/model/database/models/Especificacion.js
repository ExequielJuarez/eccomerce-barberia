module.exports = (sequelize, DataTypes) => {
  const Especificacion = sequelize.define(
    "Especificacion",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      productoId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      clave: { type: DataTypes.STRING(60), allowNull: false },
      valor: { type: DataTypes.STRING(120), allowNull: false },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "especificaciones", timestamps: false }
  );

  Especificacion.associate = (db) => {
    Especificacion.belongsTo(db.Producto, { as: "producto", foreignKey: "productoId" });
  };

  return Especificacion;
};
