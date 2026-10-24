module.exports = (sequelize, DataTypes) => {
  const Barbero = sequelize.define(
    "Barbero",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      sucursalId: DataTypes.SMALLINT.UNSIGNED,
      usuarioId: { type: DataTypes.INTEGER.UNSIGNED, unique: true },
      foto: DataTypes.STRING(255),
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "barberos", timestamps: false }
  );

  Barbero.associate = (db) => {
    Barbero.hasMany(db.Turno, { as: "turnos", foreignKey: "barberoId" });
    Barbero.belongsTo(db.Sucursal, { as: "sucursal", foreignKey: "sucursalId" });
    Barbero.belongsTo(db.Usuario, { as: "usuario", foreignKey: "usuarioId" });
  };

  return Barbero;
};
