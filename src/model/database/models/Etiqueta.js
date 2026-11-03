module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Etiqueta",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(24), allowNull: false, unique: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "etiquetas", timestamps: false }
  );
