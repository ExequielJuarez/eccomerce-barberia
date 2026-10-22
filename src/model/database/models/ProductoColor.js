module.exports = (sequelize, DataTypes) => {
  const ProductoColor = sequelize.define(
    "ProductoColor",
    {
      productoId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      colorId: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "producto_colores", timestamps: false }
  );
  return ProductoColor;
};
