// Después de confirmar, abre solo el WhatsApp del local con el pedido (el botón queda por si el navegador lo bloquea).
(() => {
  const boton = document.querySelector("[data-auto-wa]");
  if (!boton || !/[?&]enviar=1/.test(location.search)) return;
  history.replaceState(null, "", location.pathname);
  setTimeout(() => { location.href = boton.href; }, 1200);
})();
