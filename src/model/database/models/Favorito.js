module.exports = (sequelize, DataTypes) => {
  const Favorito = sequelize.define(
    "Favorito",
    {
      usuarioId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      productoId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    },
    { tableName: "favoritos", updatedAt: false }
  );

  Favorito.associate = (db) => {
    Favorito.belongsTo(db.Usuario, { as: "usuario", foreignKey: "usuarioId" });
    Favorito.belongsTo(db.Producto, { as: "producto", foreignKey: "productoId" });
  };

  return Favorito;
};
