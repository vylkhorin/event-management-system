// js/auth.js

// REGISTER
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    try {
      await apiPost("/auth/register", { name, email, password, role });
      alert("Registration successful. Please login.");
      window.location.href = "login.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const data = await apiPost("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("name", data.user.name);

      if (data.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "user.html";
      }
    } catch (err) {
      alert(err.message);
    }
  });
}
