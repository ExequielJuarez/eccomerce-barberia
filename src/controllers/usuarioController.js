const crypto = require("crypto");
const { validationResult } = require("express-validator");
const usuarios = require("../services/usuarioService");
const correo = require("../services/correoService");
const codigos = require("../services/codigoService");
const { destinoSeguro, iniciarSesion } = require("../helpers/sesion");

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60 * 1000;

const GOOGLE = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callback: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",
};
const googleConfigurado = () => Boolean(GOOGLE.clientId && GOOGLE.clientSecret);

const enProduccion = () => process.env.NODE_ENV === "production";

const googleDisponible = () => googleConfigurado() || !enProduccion();

function renderLogin(res, { req, datos = {}, errores = {}, errorGeneral = null, status = 200 }) {
  res.status(status).render("login", {
    titulo: "Iniciar sesión",
    estilo: ["acceso", "login"],
    datos,
    errores,
    errorGeneral,
    mostrarDemo: !enProduccion(),
    codigoDisponible: codigos.disponible(),
    googleDisponible: googleDisponible(),
    ...destinoYCompra(req),
  });
}

function destinoYCompra(req) {
  return { volver: destinoSeguro(req.query.volver || req.body?.volver) };
}

function renderPedirCodigo(res, { req, motivo, datos = {}, errores = {}, errorGeneral = null, status = 200 }) {
  res.status(status).render("login-codigo", {
    titulo: motivo === "recuperar" ? "Recuperar tu cuenta" : "Entrar con un código",
    estilo: ["acceso", "login-codigo"],
    motivo,
    datos,
    errores,
    errorGeneral,
    disponible: codigos.disponible(),
    ...destinoYCompra(req),
  });
}

function renderVerificar(res, { req, errorGeneral = null, status = 200 }) {
  const pendiente = req.session.codigo;
  res.status(status).render("verificar-codigo", {
    titulo: "Ingresá el código",
    estilo: ["acceso", "verificar-codigo"],
    motivo: pendiente.motivo,
    emailOculto: codigos.ocultarEmail(pendiente.email),
    codigoDemo: pendiente.demo,
    esperaReenvio: Math.max(0, Math.ceil((codigos.ESPERA_REENVIO_MS - (Date.now() - pendiente.enviadoEn)) / 1000)),
    venceMin: codigos.VENCE_MIN,
    errorGeneral,
  });
}

function renderRegistro(res, { req, datos = {}, errores = {}, status = 200 }) {
  res.status(status).render("registro", {
    titulo: "Crear cuenta",
    estilo: ["acceso", "registro"],
    datos,
    errores,
    googleDisponible: googleDisponible(),
    ...destinoYCompra(req),
  });
}

module.exports = {

  verLogin(req, res) {
    renderLogin(res, { req });
  },

  async login(req, res) {
    const datos = { email: req.body.email || "", recordar: Boolean(req.body.recordar) };

    const intentos = req.session.intentosLogin || { cantidad: 0, hasta: 0 };
    if (intentos.hasta > Date.now()) {
      const segundos = Math.ceil((intentos.hasta - Date.now()) / 1000);
      return renderLogin(res, {
        req, datos, status: 429,
        errorGeneral: `Demasiados intentos. Probá de nuevo en ${segundos} segundos.`,
      });
    }

    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
      return renderLogin(res, { req, datos, errores: resultado.mapped(), status: 422 });
    }

    const usuario = await usuarios.verificar(req.body.email, req.body.password);

    if (!usuario) {
      intentos.cantidad += 1;
      if (intentos.cantidad >= MAX_INTENTOS) {
        intentos.cantidad = 0;
        intentos.hasta = Date.now() + BLOQUEO_MS;
      }
      req.session.intentosLogin = intentos;
      return renderLogin(res, {
        req, datos, status: 401,
        errorGeneral: "El email o la contraseña no son correctos.",
      });
    }

    iniciarSesion(req, res, usuario, { recordar: datos.recordar, volver: req.body.volver });
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  },

  verRegistro(req, res) {
    renderRegistro(res, { req });
  },

  async registrar(req, res) {
    const { nombre, apellido, email, telefono } = req.body;
    const datos = { nombre, apellido, email, telefono, newsletter: Boolean(req.body.newsletter), terminos: req.body.terminos === "1" };

    const resultado = validationResult(req);
    if (!resultado.isEmpty()) {
      return renderRegistro(res, { req, datos, errores: resultado.mapped(), status: 422 });
    }

    const cuenta = {
      nombre,
      apellido,
      email,
      telefono,
      passwordHash: await usuarios.hashear(req.body.password),
      newsletter: datos.newsletter,
    };

    if (!codigos.disponible()) {
      const usuario = await usuarios.crear(cuenta);
      return iniciarSesion(req, res, usuario, {
        volver: req.body.volver,
        mensaje: `¡Bienvenido/a, ${usuario.nombre}! Tu cuenta está lista.`,
      });
    }

    const envio = await codigos.enviar(req.session, {
      email,
      motivo: "registro",
      volver: destinoSeguro(req.body.volver),
      datos: cuenta,
    });
    if (!envio.ok) {
      const errores = { email: { msg: envio.mensaje } };
      return renderRegistro(res, { req, datos, errores, status: 503 });
    }
    req.session.save(() => res.redirect("/verificar"));
  },

  verPedirCodigo(req, res) {
    const motivo = req.query.motivo === "recuperar" ? "recuperar" : "login";
    renderPedirCodigo(res, { req, motivo, datos: { email: String(req.query.email || "").slice(0, 120) } });
  },

  async pedirCodigo(req, res) {
    const motivo = req.body.motivo === "recuperar" ? "recuperar" : "login";
    const email = String(req.body.email || "").trim().toLowerCase();
    const datos = { email };
    const error = (msg, status = 422) =>
      renderPedirCodigo(res, { req, motivo, datos, errores: { email: { msg } }, status });

    if (!codigos.disponible()) return error("Por ahora no podemos mandar códigos. Entrá con tu contraseña o con Google.", 503);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return error("Ingresá un email válido");

    const usuario = await usuarios.buscarPorEmail(email);
    if (!usuario) return error("No hay ninguna cuenta con ese email. Revisalo o creá una cuenta nueva.", 404);

    const envio = await codigos.enviar(req.session, { email, motivo, volver: destinoSeguro(req.body.volver) });
    if (!envio.ok) return error(envio.mensaje, 429);
    req.session.save(() => res.redirect("/verificar"));
  },

  verVerificar(req, res) {
    if (!req.session.codigo) return res.redirect("/login");
    renderVerificar(res, { req });
  },

  async confirmarCodigo(req, res) {
    if (!req.session.codigo) return res.redirect("/login");
    const motivoAntes = req.session.codigo.motivo;
    const resultado = codigos.verificar(req.session, req.body.codigo);

    if (!resultado.ok) {
      if (resultado.agotado) {
        req.session.flash = resultado.mensaje;
        return res.redirect(motivoAntes === "registro" ? "/registro" : `/login/codigo${motivoAntes === "recuperar" ? "?motivo=recuperar" : ""}`);
      }
      return renderVerificar(res, { req, errorGeneral: resultado.mensaje, status: 422 });
    }

    const { email, motivo, volver, datos } = resultado.pendiente;
    if (motivo === "registro") {

      if (await usuarios.buscarPorEmail(email)) {
        req.session.flash = "Ya existe una cuenta con ese email: entrá con tu contraseña o con un código.";
        return res.redirect("/login");
      }
      const usuario = await usuarios.crear(datos);
      return iniciarSesion(req, res, usuario, {
        volver,
        mensaje: `¡Bienvenido/a, ${usuario.nombre}! Confirmaste tu email y tu cuenta está lista.`,
      });
    }

    const usuario = await usuarios.buscarPorEmail(email);
    if (!usuario) {
      req.session.flash = "No encontramos esa cuenta.";
      return res.redirect("/login");
    }
    if (motivo === "recuperar") {

      return iniciarSesion(req, res, usuario, {
        volver: "/mi-cuenta/datos?clave=nueva",
        mensaje: "Entraste a tu cuenta. Ahora elegí una contraseña nueva.",
        extra: { recuperoClaveEn: Date.now() },
      });
    }
    iniciarSesion(req, res, usuario, { volver });
  },

  async reenviarCodigo(req, res) {
    if (!req.session.codigo) return res.redirect("/login");
    const envio = await codigos.reenviar(req.session);
    if (!envio.ok) return renderVerificar(res, { req, errorGeneral: envio.mensaje, status: 429 });
    req.session.flash = "Te mandamos un código nuevo.";
    req.session.save(() => res.redirect("/verificar"));
  },

  googleInicio(req, res) {
    const volver = destinoSeguro(req.query.volver);
    if (!googleConfigurado()) {
      if (enProduccion()) {
        req.session.flash = "El inicio de sesión con Google todavía no está disponible. Entrá con tu email.";
        return res.redirect("/login");
      }
      return res.redirect(`/auth/google/demo?volver=${encodeURIComponent(volver)}`);
    }

    const state = crypto.randomBytes(16).toString("hex");
    req.session.google = { state, volver };

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: GOOGLE.clientId,
      redirect_uri: GOOGLE.callback,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    req.session.save(() => res.redirect(url.toString()));
  },

  async googleCallback(req, res) {
    const esperado = req.session.google;
    delete req.session.google;

    if (!esperado || req.query.state !== esperado.state || !req.query.code) {
      req.session.flash = "No pudimos iniciar sesión con Google. Probá de nuevo.";
      return res.redirect("/login");
    }

    try {

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: req.query.code,
          client_id: GOOGLE.clientId,
          client_secret: GOOGLE.clientSecret,
          redirect_uri: GOOGLE.callback,
          grant_type: "authorization_code",
        }),
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(token.error_description || "Token inválido");

      const perfilRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const perfil = await perfilRes.json();
      if (!perfilRes.ok || !perfil.email_verified) throw new Error("Email de Google no verificado");

      const usuario = await usuarios.desdeGoogle({
        googleId: perfil.sub,
        email: perfil.email,
        nombre: perfil.given_name || perfil.name || "Cliente",
        apellido: perfil.family_name || "",
      });
      iniciarSesion(req, res, usuario, { volver: esperado.volver });
    } catch (error) {
      console.error("Error en el login con Google:", error.message);
      req.session.flash = "No pudimos iniciar sesión con Google. Probá de nuevo.";
      res.redirect("/login");
    }
  },

  googleDemo(req, res) {
    if (googleConfigurado() || enProduccion()) return res.redirect("/auth/google");
    res.render("google-demo", {
      titulo: "Continuar con Google",
      estilo: "google-demo",
      volver: destinoSeguro(req.query.volver),
      errores: {},
      datos: {},
    });
  },

  async googleDemoConfirmar(req, res) {
    if (googleConfigurado() || enProduccion()) return res.redirect("/auth/google");

    const email = String(req.body.email || "").trim().toLowerCase();
    const nombre = String(req.body.nombre || "").trim();
    const error = (msg) =>
      res.status(422).render("google-demo", {
        titulo: "Continuar con Google",
        estilo: "google-demo",
        volver: destinoSeguro(req.body.volver),
        datos: { email, nombre },
        errores: { email: { msg } },
      });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || nombre.length < 2) {
      return error("Completá un nombre y un email válidos");
    }

    const existente = await usuarios.buscarPorEmail(email);
    if (existente && existente.googleId !== `demo-${email}`) {
      return error("Ya existe una cuenta con ese email: entrá con tu contraseña");
    }

    const [primerNombre, ...resto] = nombre.split(" ");
    const usuario = await usuarios.desdeGoogle({
      googleId: `demo-${email}`,
      email,
      nombre: primerNombre,
      apellido: resto.join(" "),
    });
    iniciarSesion(req, res, usuario, { volver: req.body.volver });
  },
};
