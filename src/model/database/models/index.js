"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");

const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, "../config/config.js"))[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const db = {};

fs.readdirSync(__dirname)
  .filter((archivo) => archivo !== "index.js" && archivo.endsWith(".js"))
  .forEach((archivo) => {
    const modelo = require(path.join(__dirname, archivo))(sequelize, Sequelize.DataTypes);
    db[modelo.name] = modelo;
  });

Object.values(db).forEach((modelo) => modelo.associate && modelo.associate(db));

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
