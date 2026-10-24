module.exports = (sequelize, DataTypes) => {
  const Turno = sequelize.define(
    "Turno",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(12), allowNull: false, unique: true },
      servicioId: DataTypes.SMALLINT.UNSIGNED,
      barberoId: DataTypes.SMALLINT.UNSIGNED,
      sucursalId: DataTypes.SMALLINT.UNSIGNED,
      servicio: { type: DataTypes.STRING(80), allowNull: false },
      barbero: { type: DataTypes.STRING(60), allowNull: false },
      sucursal: DataTypes.STRING(60),
      cliente: { type: DataTypes.STRING(90), allowNull: false },
      telefono: { type: DataTypes.STRING(25), allowNull: false },
      notas: DataTypes.STRING(200),
      fecha: { type: DataTypes.DATEONLY, allowNull: false },
      inicio: { type: DataTypes.TIME, allowNull: false },
      fin: { type: DataTypes.TIME, allowNull: false },
      estado: {
        type: DataTypes.ENUM("reservado", "confirmado", "completado", "cancelado", "ausente"),
        allowNull: false,
        defaultValue: "reservado",
      },
    },
    { tableName: "turnos", updatedAt: false }
  );

  Turno.associate = (db) => {
    Turno.belongsTo(db.ServicioTurno, { as: "servicioRef", foreignKey: "servicioId" });
    Turno.belongsTo(db.Barbero, { as: "barberoRef", foreignKey: "barberoId" });
    Turno.belongsTo(db.Sucursal, { as: "sucursalRef", foreignKey: "sucursalId" });
  };

  return Turno;
};
