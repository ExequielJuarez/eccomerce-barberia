module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "BloqueoTurno",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      fecha: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
      motivo: DataTypes.STRING(80),
    },
    { tableName: "bloqueos_turno", timestamps: false }
  );
};
