document.addEventListener("DOMContentLoaded", async () => {
  await updateCartBadge();
  setupProductCards();

  const acctBtn = document.getElementById("account-box");
  if (acctBtn) {
    acctBtn.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }
});
