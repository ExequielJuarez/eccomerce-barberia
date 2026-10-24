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
      telefono: DataTypes.STRING(20),
      password: DataTypes.CHAR(60),
      googleId: { type: DataTypes.STRING(64), unique: true },
      rol: { type: DataTypes.ENUM("cliente", "admin", "superadmin", "barbero"), allowNull: false, defaultValue: "cliente" },
      newsletter: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      dni: DataTypes.STRING(8),
      calle: DataTypes.STRING(90),
      altura: DataTypes.STRING(10),
      piso: DataTypes.STRING(20),
      codigoPostal: DataTypes.CHAR(4),
      ciudad: DataTypes.STRING(80),
      provincia: DataTypes.STRING(60),
    },
    {
      tableName: "usuarios",

      defaultScope: { attributes: { exclude: ["password"] } },
      scopes: { conPassword: { attributes: { include: ["password"] } } },
    }
  );

  Usuario.associate = (db) => {
    Usuario.hasMany(db.Pedido, { as: "pedidos", foreignKey: "usuarioId" });
    Usuario.belongsToMany(db.Producto, {
      as: "favoritos",
      through: db.Favorito,
      foreignKey: "usuarioId",
      otherKey: "productoId",
    });
  };

  return Usuario;
};
