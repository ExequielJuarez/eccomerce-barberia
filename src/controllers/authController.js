const usuarios = require("../services/usuarioService");
const { esAdmin } = require("../helpers/roles");

const SESION_MS = 8 * 60 * 60 * 1000;
const CLAVES_DE_PRUEBA = ["Admin1234", "Super1234", "Demo1234"];
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

// Bloqueo por cuenta (además del límite por IP): frena a quien prueba claves desde varias direcciones.
const fallos = new Map();
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, f] of fallos) if (f.hasta < ahora && f.ultimo < ahora - BLOQUEO_MS) fallos.delete(clave);
}, 10 * 60 * 1000).unref();

const clave = (email) => String(email).trim().toLowerCase().slice(0, 120);

function render(res, { email = "", error = null, status = 200 } = {}) {
  res.status(status).render("admin-login", { titulo: "Ingreso al panel", estilo: "acceso", email, error });
}

module.exports = {
  ver(req, res) {
    if (esAdmin(req.session.usuarioLogueado)) return res.redirect("/admin");
    render(res);
  },

  async entrar(req, res) {
    const email = typeof req.body.email === "string" ? req.body.email.trim().slice(0, 120) : "";
    const password = typeof req.body.password === "string" ? req.body.password.slice(0, 200) : "";
    if (!email || !password) return render(res, { email, error: "Ingresá tu usuario y tu contraseña.", status: 422 });

    const estado = fallos.get(clave(email));
    if (estado && estado.hasta > Date.now()) {
      return render(res, { email, error: "Demasiados intentos con este usuario. Probá de nuevo en unos minutos.", status: 429 });
    }

    const usuario = await usuarios.verificar(email, password);
    if (!usuario || !esAdmin(usuario)) {
      const f = fallos.get(clave(email)) || { cantidad: 0, hasta: 0, ultimo: 0 };
      f.cantidad += 1;
      f.ultimo = Date.now();
      if (f.cantidad >= MAX_FALLOS) Object.assign(f, { cantidad: 0, hasta: Date.now() + BLOQUEO_MS });
      fallos.set(clave(email), f);
      console.warn(`🔒 Ingreso fallido al panel (${req.ip}) usuario: ${clave(email)}`);
      return render(res, { email, error: "Usuario o contraseña incorrectos.", status: 401 });
    }

    if (process.env.NODE_ENV === "production" && CLAVES_DE_PRUEBA.includes(password)) {
      return render(res, { email, error: "Esa es una clave de prueba y está bloqueada. Cambiala desde la consola con: npm run admin -- " + clave(email), status: 403 });
    }

    fallos.delete(clave(email));
    // Sesión nueva en cada ingreso (evita fijación de sesión).
    req.session.regenerate((err) => {
      if (err) return render(res, { email, error: "No pudimos iniciar sesión, probá de nuevo.", status: 500 });
      req.session.usuarioLogueado = usuario;
      req.session.cookie.maxAge = SESION_MS;
      req.session.save(() => res.redirect("/admin"));
    });
  },

  salir(req, res) {
    req.session.destroy(() => {
      res.clearCookie("bb.sid");
      res.redirect("/admin/login");
    });
  },
};
