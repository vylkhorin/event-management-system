// js/main.js  —  Shared utilities for all EMS pages
const API = 'http://localhost:5000/api';

/* ──────────────────────────────────────
   Auth helpers
────────────────────────────────────── */
const getToken = () => localStorage.getItem('token');
const getRole  = () => localStorage.getItem('role');
const getName  = () => localStorage.getItem('name');

function authHeaders(extra = {}) {
  const t = getToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra
  };
}

function ensureLoggedIn() {
  if (!getToken()) window.location.href = 'login.html';
}

function ensureAdmin() {
  ensureLoggedIn();
  if (getRole() !== 'admin') {
    showToast('Admin access only', 'error');
    setTimeout(() => { window.location.href = 'user.html'; }, 1200);
  }
}

async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API}/auth/logout-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Logout request failed', e);
    }
  }
  localStorage.clear();
  window.location.href = 'login.html';
}

/* ──────────────────────────────────────
   HTTP helpers
────────────────────────────────────── */
async function handle(res) {
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() });
  return handle(res);
}

async function apiPost(path, body = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  return handle(res);
}

async function apiPut(path, body = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  return handle(res);
}

async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', headers: authHeaders() });
  return handle(res);
}

// Multipart form-data (for file uploads)
async function apiPostForm(path, formData) {
  const t = getToken();
  const headers = t ? { Authorization: `Bearer ${t}` } : {};
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: formData });
  return handle(res);
}

async function apiPutForm(path, formData) {
  const t = getToken();
  const headers = t ? { Authorization: `Bearer ${t}` } : {};
  const res = await fetch(`${API}${path}`, { method: 'PUT', headers, body: formData });
  return handle(res);
}

/* ──────────────────────────────────────
   Toast Notifications
────────────────────────────────────── */
(function initToast() {
  if (document.getElementById('toast-container')) return;
  const el = document.createElement('div');
  el.id = 'toast-container';
  document.body.appendChild(el);
})();

const TOAST_ICONS = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="material-icons">${TOAST_ICONS[type] || 'info'}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/* ──────────────────────────────────────
   Confirm Dialog (replaces confirm())
────────────────────────────────────── */
function showConfirm(title, message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center">
        <div class="confirm-icon">
          <span class="material-icons">warning_amber</span>
        </div>
        <h3 class="modal-title" style="margin-bottom:10px">${title}</h3>
        <p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:24px">${message}</p>
        <div class="modal-footer" style="justify-content:center">
          <button class="btn btn-secondary" id="confirmNo">Cancel</button>
          <button class="btn btn-danger" id="confirmYes">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = (val) => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
      resolve(val);
    };

    overlay.querySelector('#confirmYes').onclick = () => close(true);
    overlay.querySelector('#confirmNo').onclick  = () => close(false);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  });
}

/* ──────────────────────────────────────
   Skeleton Loaders
────────────────────────────────────── */
function renderSkeletons(containerId, count = 6) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line" style="width:70%;margin-bottom:10px"></div>
        <div class="skeleton skeleton-line" style="width:50%;margin-bottom:10px"></div>
        <div class="skeleton skeleton-line" style="width:60%"></div>
      </div>
    </div>
  `).join('');
}

/* ──────────────────────────────────────
   Empty State
────────────────────────────────────── */
function renderEmpty(containerId, icon = 'inbox', title = 'Nothing here yet', sub = '') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1">
      <span class="material-icons">${icon}</span>
      <h3>${title}</h3>
      ${sub ? `<p>${sub}</p>` : ''}
    </div>
  `;
}

/* ──────────────────────────────────────
   Pagination Renderer
────────────────────────────────────── */
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
    <span class="material-icons" style="font-size:18px">chevron_left</span>
  </button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 3) {
      html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
    }
  }

  html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
    <span class="material-icons" style="font-size:18px">chevron_right</span>
  </button>`;

  el.innerHTML = html;
  el.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
}

/* ──────────────────────────────────────
   Category badge color map
────────────────────────────────────── */
const CATEGORY_COLORS = {
  'Music':     'badge-rose',
  'Tech':      'badge-blue',
  'Sports':    'badge-green',
  'Art':       'badge-purple',
  'Business':  'badge-amber',
  'Food':      'badge-amber',
  'Health':    'badge-green',
  'Education': 'badge-blue',
  'Other':     'badge-gray'
};

function categoryBadge(cat) {
  const cls = CATEGORY_COLORS[cat] || 'badge-gray';
  return `<span class="badge ${cls}">${cat || 'Other'}</span>`;
}

/* ──────────────────────────────────────
   Date formatting helpers
────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return 'TBA';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return 'TBA';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtPrice(p) {
  if (p === 0) return 'Free';
  return `$${Number(p).toLocaleString('en-US')}`; // Use $ globally since user requested it
}

/* ──────────────────────────────────────
   Theme Toggle (Dark/Light)
────────────────────────────────────── */
(function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Wait for DOM to load to attach event listener to toggle if it exists
  window.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      // Set initial icon
      toggleBtn.innerHTML = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
      
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        toggleBtn.innerHTML = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
      });
    }
  });
})();
