// js/auth.js — Login & Register logic

/* ───── LOGIN ───── */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type=submit]');
    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;font-size:18px">refresh</span> Logging in…';

    try {
      const data = await apiPost('/auth/login', { identifier, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role',  data.user.role);
      localStorage.setItem('name',  data.user.name);
      localStorage.setItem('email', data.user.email);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      setTimeout(() => {
        window.location.href = data.user.role === 'admin' ? 'admin.html' : 'user.html';
      }, 700);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons">login</span> Login';
    }
  });
}

/* ───── REGISTER ───── */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('button[type=submit]');
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const role     = document.getElementById('regRole')?.value || 'user';
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirm')?.value;

    if (confirm && password !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;font-size:18px">refresh</span> Creating account…';

    try {
      const data = await apiPost('/auth/register', { name, email, password, role });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role',  data.user.role);
      localStorage.setItem('name',  data.user.name);
      localStorage.setItem('email', data.user.email);
      showToast('Account created! Welcome 🎉', 'success');
      setTimeout(() => { window.location.href = data.user.role === 'admin' ? 'admin.html' : 'user.html'; }, 800);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons">person_add</span> Create Account';
    }
  });
}

// Spinner keyframes (injected inline so auth pages don't need theme.css)
const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(spinStyle);
