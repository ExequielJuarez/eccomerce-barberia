module.exports = (sequelize, DataTypes) => {
  const Barbero = sequelize.define(
    "Barbero",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "barberos", timestamps: false }
  );

  Barbero.associate = (db) => {
    Barbero.hasMany(db.Turno, { as: "turnos", foreignKey: "barberoId" });
  };

  return Barbero;
};
