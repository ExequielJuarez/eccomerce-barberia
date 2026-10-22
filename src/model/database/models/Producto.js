module.exports = (sequelize, DataTypes) => {
  const Producto = sequelize.define(
    "Producto",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(90), allowNull: false },
      categoriaId: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      subcategoriaId: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      colorId: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      precio: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
      costo: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
      stock: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      etiqueta: DataTypes.STRING(24),
      resumen: DataTypes.STRING(255),
      descripcion: DataTypes.TEXT,
      destacados: DataTypes.TEXT,
    },
    { tableName: "productos" }
  );

  Producto.associate = (db) => {
    Producto.belongsTo(db.Categoria, { as: "categoria", foreignKey: "categoriaId" });
    Producto.belongsTo(db.Subcategoria, { as: "subcategoria", foreignKey: "subcategoriaId" });
    Producto.belongsTo(db.Color, { as: "color", foreignKey: "colorId" });

    Producto.belongsToMany(db.Color, {
      as: "colores",
      through: db.ProductoColor,
      foreignKey: "productoId",
      otherKey: "colorId",
    });
    Producto.hasMany(db.Especificacion, { as: "especificaciones", foreignKey: "productoId" });
    Producto.hasMany(db.ProductoImagen, { as: "imagenes", foreignKey: "productoId" });
    Producto.hasMany(db.PedidoItem, { as: "ventas", foreignKey: "productoId" });
    Producto.belongsToMany(db.Usuario, {
      as: "guardadoPor",
      through: db.Favorito,
      foreignKey: "productoId",
      otherKey: "usuarioId",
    });
  };

  return Producto;
};
