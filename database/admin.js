// Crea un administrador o cambia la clave de uno existente (la clave se pide por consola, sin mostrarla).
//   npm run admin -- usuario@mail.com "Nombre Apellido"            (superadmin con --super)
require("dotenv").config();
const readline = require("readline");
const bcrypt = require("bcryptjs");
const db = require("../src/model/database/models");

const [email, ...resto] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const esSuper = process.argv.includes("--super");
const nombre = resto.join(" ").trim();

function pedirClave(texto) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(texto) ? s : "");
    rl.question(texto, (r) => {
      rl.output.write("\n");
      rl.close();
      resolve(r);
    });
  });
}

const claveSegura = (c) => c.length >= 10 && /[a-z]/.test(c) && /[A-Z]/.test(c) && /\d/.test(c) && !/^(Admin|Super|Demo)1234$/.test(c);

(async () => {
  if (!email || !/^[\w.@+-]{3,120}$/.test(email)) {
    console.log('Uso: npm run admin -- <usuario o email> "Nombre Apellido" [--super]');
    process.exit(1);
  }
  const clave = await pedirClave("Contraseña nueva (10+ caracteres, mayúscula, minúscula y número): ");
  if (!claveSegura(clave)) {
    console.log("La contraseña es muy débil.");
    process.exit(1);
  }
  const repetida = await pedirClave("Repetila: ");
  if (clave !== repetida) {
    console.log("No coinciden.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(clave, 12);
  const usuario = await db.Usuario.findOne({ where: { email: email.toLowerCase() } });
  if (usuario) {
    await usuario.update({ password: hash, ...(esSuper ? { rol: "superadmin" } : {}) });
    console.log(`✅ Clave actualizada para ${usuario.email} (${usuario.rol}).`);
  } else {
    if (!nombre) {
      console.log("Para crear un usuario nuevo indicá también el nombre.");
      process.exit(1);
    }
    await db.Usuario.create({ nombre, email, password: hash, rol: esSuper ? "superadmin" : "admin" });
    console.log(`✅ Usuario ${email} creado como ${esSuper ? "superadmin" : "admin"}.`);
  }
  process.exit(0);
})().catch((error) => {
  console.error("❌", error.message);
  process.exit(1);
});
