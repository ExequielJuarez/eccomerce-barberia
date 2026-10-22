module.exports = (sequelize, DataTypes) => {
  const Cupon = sequelize.define(
    "Cupon",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      codigo: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        set(valor) {
          this.setDataValue("codigo", String(valor).trim().toUpperCase());
        },
      },
      descripcion: { type: DataTypes.STRING(120), allowNull: false },
      porcentaje: { type: DataTypes.DECIMAL(5, 4), allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      venceEn: DataTypes.DATE,
    },
    { tableName: "cupones" }
  );

  return Cupon;
};
