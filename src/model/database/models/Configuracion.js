module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Configuracion",
    {
      clave: { type: DataTypes.STRING(40), primaryKey: true },
      valor: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    },
    { tableName: "configuracion", createdAt: false, updatedAt: "actualizado_en" }
  );
