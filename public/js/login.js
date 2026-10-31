document.querySelectorAll("[data-ver-clave]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const campo = boton.parentElement.querySelector("input");
    const visible = campo.type === "text";
    campo.type = visible ? "password" : "text";
    boton.textContent = visible ? "Ver" : "Ocultar";
    boton.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  });
});
