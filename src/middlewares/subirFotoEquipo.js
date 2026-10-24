const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const TIPOS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const subir = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../public/img/equipo"),
    filename: (req, file, cb) => cb(null, `equipo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${TIPOS[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (TIPOS[file.mimetype]) return cb(null, true);
    const error = new Error("tipo");
    error.code = "TIPO_INVALIDO";
    cb(error);
  },
}).single("foto");

const MENSAJES = {
  LIMIT_FILE_SIZE: "La foto puede pesar hasta 2 MB",
  TIPO_INVALIDO: "La foto tiene que ser JPG, PNG o WEBP",
};

module.exports = (req, res, next) => {
  subir(req, res, (err) => {
    if (err) req.errorFoto = MENSAJES[err.code] || "No se pudo subir la foto";
    next();
  });
};
