module.exports = (sequelize, DataTypes) => {
  const Color = sequelize.define(
    "Color",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      valor: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      nombre: { type: DataTypes.STRING(40), allowNull: false },
      hex: { type: DataTypes.CHAR(7), allowNull: false },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "colores", timestamps: false }
  );

  Color.associate = (db) => {
    Color.hasMany(db.Producto, { as: "productos", foreignKey: "colorId" });
  };

  return Color;
};
