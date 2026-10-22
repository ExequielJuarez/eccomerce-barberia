const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { MAX_IMAGENES } = require("../services/productoService");

const TIPOS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const subir = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../public/img/productos"),
    filename: (req, file, cb) => cb(null, `producto-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${TIPOS[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: MAX_IMAGENES },
  fileFilter: (req, file, cb) => {
    if (TIPOS[file.mimetype]) return cb(null, true);
    const error = new Error("tipo");
    error.code = "TIPO_INVALIDO";
    cb(error);
  },
}).array("imagenes", MAX_IMAGENES);

const MENSAJES = {
  LIMIT_FILE_SIZE: "Cada imagen puede pesar hasta 2 MB",
  LIMIT_FILE_COUNT: `Podés subir hasta ${MAX_IMAGENES} imágenes`,
  LIMIT_UNEXPECTED_FILE: `Podés subir hasta ${MAX_IMAGENES} imágenes`,
  TIPO_INVALIDO: "Las imágenes tienen que ser JPG, PNG o WEBP",
};

module.exports = (req, res, next) => {
  subir(req, res, (err) => {
    if (err) req.errorImagen = MENSAJES[err.code] || "No se pudieron subir las imágenes";
    req.files = req.files || [];
    next();
  });
};
