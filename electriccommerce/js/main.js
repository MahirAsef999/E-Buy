document.addEventListener("DOMContentLoaded", async () => {
  await updateCartBadge();
  setupProductCards();

  acctBtn = document.getElementById("account-box");

  acctBtn.addEventListener("click", async () => {
    const response = api("/account");
    window.location.href = `/${response.userID}`;
  })
});
