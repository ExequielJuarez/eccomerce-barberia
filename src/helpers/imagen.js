const fs = require("fs");

// Revisa los primeros bytes del archivo: el tipo que declara el navegador no alcanza para confiar en él.
function esImagenReal(ruta) {
  let fd;
  try {
    fd = fs.openSync(ruta, "r");
    const b = Buffer.alloc(12);
    fs.readSync(fd, b, 0, 12, 0);
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    return jpg || png || webp;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// Deja solo los archivos que de verdad son imágenes y borra el resto.
function filtrarImagenes(archivos) {
  const buenos = [];
  let descartados = 0;
  for (const f of archivos || []) {
    if (esImagenReal(f.path)) buenos.push(f);
    else {
      descartados += 1;
      fs.unlink(f.path, () => {});
    }
  }
  return { buenos, descartados };
}

module.exports = { esImagenReal, filtrarImagenes };
