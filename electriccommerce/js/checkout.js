document.addEventListener("DOMContentLoaded", async () => {
  const summaryEl = document.getElementById("order-summary");
  const calcEl = document.getElementById("order-calculations");

  try {
    const cart = await api("/cart");

    if (!cart.items.length) {
      summaryEl.textContent = "Your cart is empty.";
      calcEl.textContent = "";
      return;
    }

    let subtotal = 0;
    summaryEl.innerHTML = "";

    cart.items.forEach(item => {
      const lineTotal = item.price * item.qty;
      subtotal += lineTotal;

      const div = document.createElement("div");
      div.textContent =
        item.productId + " x" + item.qty + ": $" + lineTotal.toFixed(2);
      summaryEl.appendChild(div);
    });

    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    calcEl.innerHTML =
      "Subtotal: $" + subtotal.toFixed(2) + "<br>" +
      "Tax: $" + tax.toFixed(2) + "<br>" +
      "Total: $" + total.toFixed(2);
  } catch (e) {
    summaryEl.textContent = "Failed to load order.";
    calcEl.textContent = "";
  }

  const btn = document.getElementById("place-order");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const first = document.getElementById("first-name").value.trim();
    const last = document.getElementById("last-name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    const email = document.getElementById("email").value.trim();
    const cardNumber = document.getElementById("card-number").value.trim();
    const exp = document.getElementById("card-expiration").value.trim();
    const cvv = document.getElementById("card-cvv").value.trim();

    if (!first || !last || !address || !phone || !email || !cardNumber || !exp || !cvv) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const order = await api("/orders", { method: "POST" });
      await api("/payments/mock", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id })
      });
      alert("Order placed successfully! Order ID: " + order.id + "\nTotal: $" + order.total);
      window.location.href = "main.html";
    } catch (e) {
      alert("Failed to place order.");
    }
  });
});
