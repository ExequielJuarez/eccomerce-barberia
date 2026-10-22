require("dotenv").config();

const base = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "barba_black",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  dialect: "mysql",

  timezone: process.env.DB_TIMEZONE || "-03:00",
  logging: process.env.DB_LOG === "true" ? console.log : false,

  pool: { max: Number(process.env.DB_POOL_MAX) || 5, min: 0, idle: 10000, acquire: 30000 },

  dialectOptions: { decimalNumbers: true, dateStrings: false },
  define: {
    underscored: true,
    freezeTableName: true,
    createdAt: "creado_en",
    updatedAt: "actualizado_en",
  },
};

module.exports = {
  development: base,
  test: { ...base, database: process.env.DB_NAME_TEST || `${base.database}_test` },
  production: base,
};
