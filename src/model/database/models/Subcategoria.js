module.exports = (sequelize, DataTypes) => {
  const Subcategoria = sequelize.define(
    "Subcategoria",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      categoriaId: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      nombre: { type: DataTypes.STRING(40), allowNull: false },
      slug: { type: DataTypes.STRING(40), allowNull: false },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "subcategorias", timestamps: false }
  );

  Subcategoria.associate = (db) => {
    Subcategoria.belongsTo(db.Categoria, { as: "categoria", foreignKey: "categoriaId" });
    Subcategoria.hasMany(db.Producto, { as: "productos", foreignKey: "subcategoriaId" });
  };

  return Subcategoria;
};
