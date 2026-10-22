module.exports = (sequelize, DataTypes) => {
  const ServicioTurno = sequelize.define(
    "ServicioTurno",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(80), allowNull: false },
      detalle: DataTypes.STRING(160),
      duracion: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      precio: DataTypes.DECIMAL(12, 2),
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "servicios_turno", timestamps: false }
  );

  ServicioTurno.associate = (db) => {
    ServicioTurno.hasMany(db.Turno, { as: "turnos", foreignKey: "servicioId" });
  };

  return ServicioTurno;
};
