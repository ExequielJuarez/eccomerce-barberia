module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "HorarioTurno",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      diaSemana: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      desde: { type: DataTypes.TIME, allowNull: false },
      hasta: { type: DataTypes.TIME, allowNull: false },
    },
    { tableName: "horarios_turno", timestamps: false }
  );
};
