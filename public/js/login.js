document.querySelectorAll("[data-demo-email]").forEach((b) =>
  b.addEventListener("click", () => {
    document.getElementById("c-email").value = b.dataset.demoEmail;
    document.getElementById("c-password").value = b.dataset.demoClave;
    document.getElementById("c-password").focus();
  })
);
