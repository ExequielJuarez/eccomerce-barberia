// Utilidades del script "compartir" (no levanta túneles ni toca la base).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { extraerUrl, generarClave, esLocal, CUENTAS } = require("../scripts/compartir");

test("extrae el link público de la salida de cloudflared", () => {
  const salida = [
    "2026-10-28T12:00:02Z INF Requesting new quick Tunnel on trycloudflare.com...",
    "2026-10-28T12:00:04Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |",
    "2026-10-28T12:00:04Z INF |  https://barba-black-prueba-123.trycloudflare.com                                          |",
  ].join("\n");
  assert.equal(extraerUrl(salida), "https://barba-black-prueba-123.trycloudflare.com");
  assert.equal(extraerUrl("solo api.trycloudflare.com sin https"), null);
  assert.equal(extraerUrl(""), null);
});

test("las contraseñas generadas son largas, distintas y sin caracteres raros", () => {
  const claves = new Set(Array.from({ length: 50 }, generarClave));
  assert.equal(claves.size, 50);
  for (const c of claves) assert.match(c, /^[A-Za-z0-9_-]{12}$/);
});

test("distingue una base local de una remota", () => {
  for (const h of ["127.0.0.1", "localhost", "::1", undefined, ""]) assert.equal(esLocal(h), true, String(h));
  assert.equal(esLocal("algo-mysql.services.clever-cloud.com"), false);
});

test("las cuentas de ejemplo que se deben cambiar son las del README", () => {
  assert.deepEqual(CUENTAS.map((c) => c.email), ["demo@tienda.com", "admin@tienda.com", "super@tienda.com"]);
  assert.deepEqual(CUENTAS.map((c) => c.rol), ["cliente", "admin", "superadmin"]);
});
