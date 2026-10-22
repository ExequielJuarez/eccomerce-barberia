(() => {
  const input = document.getElementById("codigo");
  const form = document.getElementById("formCodigo");
  input?.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
    if (input.value.length === 6) form.requestSubmit();
  });
  const btn = document.getElementById("btnReenviar");
  let falta = Number(btn?.dataset.espera) || 0;
  if (!btn || !falta) return;
  const base = btn.textContent;
  const tic = () => {
    btn.disabled = falta > 0;
    btn.textContent = falta > 0 ? `${base} (${falta} s)` : base;
    if (falta-- > 0) setTimeout(tic, 1000);
  };
  tic();
})();
