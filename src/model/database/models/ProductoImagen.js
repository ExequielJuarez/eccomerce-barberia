module.exports = (sequelize, DataTypes) => {
  const ProductoImagen = sequelize.define(
    "ProductoImagen",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      productoId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      ruta: { type: DataTypes.STRING(255), allowNull: false },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "producto_imagenes", timestamps: false }
  );

  ProductoImagen.associate = (db) => {
    ProductoImagen.belongsTo(db.Producto, { as: "producto", foreignKey: "productoId" });
  };

  return ProductoImagen;
};
