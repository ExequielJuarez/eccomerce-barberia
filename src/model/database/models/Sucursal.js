module.exports = (sequelize, DataTypes) => {
  const Sucursal = sequelize.define(
    "Sucursal",
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      direccion: { type: DataTypes.STRING(120), allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orden: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    },
    { tableName: "sucursales", timestamps: false }
  );

  Sucursal.associate = (db) => {
    Sucursal.hasMany(db.Barbero, { as: "barberos", foreignKey: "sucursalId" });
  };

  return Sucursal;
};
