(() => {
  const titulos = [...document.querySelectorAll("#textoLegal h2[id]")];
  const indice = document.getElementById("indiceLegal");
  if (!indice || titulos.length < 3) return;
  indice.querySelector("ul").innerHTML = titulos.map((h) => `<li><a href="#${h.id}">${h.textContent}</a></li>`).join("");
  indice.hidden = false;
})();
