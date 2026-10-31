module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    "Usuario",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(40), allowNull: false },
      apellido: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "" },
      email: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
        set(valor) {
          this.setDataValue("email", String(valor).trim().toLowerCase());
        },
      },
      password: { type: DataTypes.CHAR(60), allowNull: false },
      rol: { type: DataTypes.ENUM("admin", "superadmin"), allowNull: false, defaultValue: "admin" },
    },
    {
      tableName: "usuarios",

      defaultScope: { attributes: { exclude: ["password"] } },
      scopes: { conPassword: { attributes: { include: ["password"] } } },
    }
  );

  return Usuario;
};
