(() => {
  document.addEventListener("bb:favorito", (e) => {
    if (e.detail.activo) return;
    const tarjeta = document.querySelector(`#favGrilla .tarjeta[data-id="${e.detail.id}"]`);
    if (!tarjeta) return;
    tarjeta.classList.add("sale");
    setTimeout(() => {
      tarjeta.remove();
      const quedan = document.querySelectorAll("#favGrilla .tarjeta").length;
      const total = document.getElementById("favTotal");
      if (total) total.textContent = quedan;
      if (!quedan) { document.getElementById("favGrilla").remove(); total?.remove(); document.getElementById("favVacio").hidden = false; }
    }, 300);
  });
})();
