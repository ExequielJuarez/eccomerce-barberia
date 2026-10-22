module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define(
    "Categoria",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "categorias", timestamps: false }
  );

  Categoria.associate = (db) => {
    Categoria.hasMany(db.Producto, { as: "productos", foreignKey: "categoriaId" });
    Categoria.hasMany(db.Subcategoria, { as: "subcategorias", foreignKey: "categoriaId" });
  };

  return Categoria;
};
