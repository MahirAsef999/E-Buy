async function postJSON(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  const msg = loginMsg;
  msg.textContent = "";
  msg.className = "muted";

  try {
    const data = await postJSON("/auth/login", { email, password });
    msg.className = "success";
    msg.textContent = "Logged in!";
    console.log("login user", data.user);
  } catch (e) {
    msg.className = "error";
    msg.textContent = e.message || "Login failed";
  }
});

document.getElementById("loginClear").onclick = () => {
  loginEmail.value = "";
  loginPassword.value = "";
  loginMsg.textContent = "";
  loginMsg.className = "muted";
};

document.getElementById("registerBtn").onclick = async () => {
  const name = regName.value.trim();
  const email = regEmail.value.trim();
  const pw = regPassword.value;
  const pw2 = regPassword2.value;
  const address = regAddress.value.trim();
  const msg = regMsg;

  msg.textContent = "";
  msg.className = "muted";

  if (pw !== pw2) {
    msg.className = "error";
    msg.textContent = "Passwords do not match";
    return;
  }
  if (pw.length < 8) {
    msg.className = "error";
    msg.textContent = "Password too short";
    return;
  }

  try {
    await postJSON("/auth/register", {
      name,
      email,
      password: pw,
      address,
    });
    msg.className = "success";
    msg.textContent = "Account created! You can sign in now.";
  } catch (e) {
    msg.className = "error";
    msg.textContent = e.message || "Registration failed";
  }
};

document.getElementById("regClear").onclick = () => {
  ["regName", "regEmail", "regPassword", "regPassword2", "regAddress"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  regMsg.textContent = "";
  regMsg.className = "muted";
};
