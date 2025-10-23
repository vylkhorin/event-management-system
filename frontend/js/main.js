// js/main.js
const API = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function getRole() {
  return localStorage.getItem("role");
}

function authHeaders(extra = {}) {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

async function apiGet(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(opts.headers) });
  return handle(res);
}

async function apiPost(path, body = {}, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: authHeaders(opts.headers),
    body: JSON.stringify(body),
  });
  return handle(res);
}

async function apiPut(path, body = {}, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: authHeaders(opts.headers),
    body: JSON.stringify(body),
  });
  return handle(res);
}

async function apiDelete(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { method: "DELETE", headers: authHeaders(opts.headers) });
  return handle(res);
}

async function handle(res) {
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function ensureLoggedIn() {
  if (!getToken()) window.location.href = "login.html";
}

function ensureAdmin() {
  ensureLoggedIn();
  if (getRole() !== "admin") {
    alert("Admins only");
    window.location.href = "user.html";
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("name");
  window.location.href = "login.html";
}
