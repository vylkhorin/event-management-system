// js/admin.js — Admin dashboard logic
ensureAdmin();

const CATEGORIES = ['Music', 'Tech', 'Sports', 'Art', 'Business', 'Food', 'Health', 'Education', 'Other'];

let editingEventId = null;
let activeTab = 'events';
let eventsPage = 1;
let bookingsPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  buildCategoryOptions();
  await Promise.all([loadReports(), loadEvents(), loadBookings(), loadUsers()]);
});

/* ────────────────────────────────
   TABS
──────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
      activeTab = btn.dataset.tab;
    });
  });
}

function buildCategoryOptions() {
  const sel = document.getElementById('evCategory');
  if (!sel) return;
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
}

/* ────────────────────────────────
   REPORTS
──────────────────────────────── */
async function loadReports() {
  try {
    const rep = await apiGet('/admin/reports');

    // Stat cards
    document.getElementById('statUsers').textContent    = rep.totalUsers    ?? 0;
    document.getElementById('statEvents').textContent   = rep.totalEvents   ?? 0;
    document.getElementById('statBookings').textContent = rep.totalBookings ?? 0;
    document.getElementById('statRevenue').textContent  = fmtPrice(rep.totalRevenue ?? 0);

    // Charts (Chart.js)
    if (window.Chart) {
      renderRevenueChart(rep.bookingsPerEvent || []);
      renderTrendChart(rep.bookingsTrend || []);
    }
  } catch (err) {
    console.error('Reports error:', err);
  }
}

function renderRevenueChart(data) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  if (ctx._chart) ctx._chart.destroy();
  ctx._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.title?.slice(0, 18) + (d.title?.length > 18 ? '…' : '') || ''),
      datasets: [{
        label: 'Revenue (₹)',
        data: data.map(d => d.revenue || 0),
        backgroundColor: 'rgba(108,99,255,0.6)',
        borderColor: 'rgba(108,99,255,1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (ctx._chart) ctx._chart.destroy();
  ctx._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d._id),
      datasets: [{
        label: 'Bookings',
        data: data.map(d => d.count),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0ea5e9'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

/* ────────────────────────────────
   EVENTS CRUD
──────────────────────────────── */
function resetEventForm() {
  editingEventId = null;
  document.getElementById('evTitle').value    = '';
  document.getElementById('evLocation').value = '';
  document.getElementById('evDate').value     = '';
  document.getElementById('evDesc').value     = '';
  document.getElementById('evTotal').value    = '';
  document.getElementById('evPrice').value    = '';
  document.getElementById('evCategory').value = 'Other';
  document.getElementById('evImage').value    = '';
  document.getElementById('editHint').textContent = '';
  document.getElementById('eventSubmitBtn').innerHTML = '<span class="material-icons">add_circle</span> Create Event';
}

async function createOrUpdateEvent() {
  const title    = document.getElementById('evTitle').value.trim();
  const location = document.getElementById('evLocation').value.trim();
  const date     = document.getElementById('evDate').value;
  const desc     = document.getElementById('evDesc').value.trim();
  const total    = Number(document.getElementById('evTotal').value || 0);
  const price    = Number(document.getElementById('evPrice').value || 0);
  const category = document.getElementById('evCategory').value;
  const imageFile = document.getElementById('evImage').files[0];

  if (!title || !date || !location) {
    showToast('Title, date, and location are required', 'warning'); return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', desc);
  formData.append('date', new Date(date).toISOString());
  formData.append('location', location);
  formData.append('category', category);
  formData.append('totalSeats', total);
  formData.append('price', price);
  if (imageFile) formData.append('image', imageFile);

  try {
    if (editingEventId) {
      await apiPutForm(`/admin/events/${editingEventId}`, formData);
      showToast('Event updated!', 'success');
    } else {
      await apiPostForm('/admin/events', formData);
      showToast('Event created!', 'success');
    }
    resetEventForm();
    loadEvents();
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadEvents() {
  renderSkeletons('eventsGrid', 6);
  try {
    const data = await apiGet(`/admin/events?page=${eventsPage}&limit=9`);
    const { events, pages } = data;
    const grid = document.getElementById('eventsGrid');

    if (!events?.length) {
      renderEmpty('eventsGrid', 'event_busy', 'No events yet', 'Create your first event above');
      return;
    }

    grid.innerHTML = events.map(ev => {
      const imgContent = ev.imageUrl
        ? `<img src="http://localhost:5000${ev.imageUrl}" style="width:100%;height:100%;object-fit:cover" alt="${ev.title}"/>`
        : `<span class="material-icons" style="font-size:40px;color:rgba(255,255,255,0.15)">image</span>`;
      
      const ratingHtml = ev.averageRating > 0 
        ? `<div style="color:var(--warning);font-size:0.85rem;display:flex;align-items:center;gap:4px;cursor:pointer;transition:0.2s" onclick='openViewReviewsModal(${JSON.stringify(ev.reviews).replace(/'/g, "&#39;")})' onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"><span class="material-icons" style="font-size:16px;">star</span> ${ev.averageRating.toFixed(1)} (${ev.reviews?.length || 0})</div>` 
        : `<div style="font-size:0.8rem;color:var(--text-muted)">No reviews</div>`;
        
      return `
        <div class="event-card">
          <div class="event-card-img">${imgContent}</div>
          <div class="event-card-body">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${categoryBadge(ev.category)}</div>
            <div class="event-card-title" style="display:flex;justify-content:space-between;align-items:flex-start;">
              <span>${ev.title}</span>
              ${ratingHtml}
            </div>
            <div class="event-card-meta">
              <div class="event-card-meta-item"><span class="material-icons">schedule</span>${fmtDateTime(ev.date)}</div>
              <div class="event-card-meta-item"><span class="material-icons">location_on</span>${ev.location}</div>
              <div class="event-card-meta-item"><span class="material-icons">chair</span>${ev.availableSeats}/${ev.totalSeats} seats</div>
              <div class="event-card-meta-item"><span class="material-icons">payments</span>${fmtPrice(ev.price)}</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:14px">
              <button class="btn btn-secondary btn-sm" style="flex:1" onclick='startEdit(${JSON.stringify(ev).replace(/'/g,"&#39;")})'>
                <span class="material-icons">edit</span> Edit
              </button>
              <button class="btn btn-danger btn-sm" style="flex:1" onclick="deleteEvent('${ev._id}')">
                <span class="material-icons">delete</span> Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination('eventsPagination', eventsPage, pages, p => { eventsPage = p; loadEvents(); });
  } catch (err) {
    renderEmpty('eventsGrid', 'error', 'Failed to load events', err.message);
  }
}

function startEdit(ev) {
  editingEventId = ev._id;
  document.getElementById('evTitle').value    = ev.title    || '';
  document.getElementById('evLocation').value = ev.location || '';
  document.getElementById('evDate').value     = ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '';
  document.getElementById('evDesc').value     = ev.description || '';
  document.getElementById('evTotal').value    = ev.totalSeats ?? '';
  document.getElementById('evPrice').value    = ev.price ?? '';
  document.getElementById('evCategory').value = ev.category || 'Other';
  document.getElementById('editHint').textContent = `✏️ Editing: ${ev.title}`;
  document.getElementById('eventSubmitBtn').innerHTML = '<span class="material-icons">save</span> Save Changes';

  // Switch to events tab and scroll to form
  document.querySelector('[data-tab="events"]')?.click();
  document.getElementById('eventForm')?.scrollIntoView({ behavior: 'smooth' });
}

async function deleteEvent(id) {
  const ok = await showConfirm('Delete Event', 'This will permanently delete the event and cancel all its bookings.');
  if (!ok) return;
  try {
    await apiDelete(`/admin/events/${id}`);
    showToast('Event deleted', 'info');
    loadEvents();
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ────────────────────────────────
   BOOKINGS
──────────────────────────────── */
function renderBookingsList(bookings) {
  const grid = document.getElementById('bookingsGrid');
  if (!bookings?.length) {
    renderEmpty('bookingsGrid', 'bookmark_border', 'No bookings found');
    return;
  }
  grid.innerHTML = bookings.map(bk => {
    const isCancelled = bk.status === 'cancelled';
    const isPending = bk.status === 'pending';
    let badgeHtml = '';
    if (isCancelled) badgeHtml = '<span class="badge badge-gray">Cancelled</span>';
    else if (isPending) badgeHtml = '<span class="badge" style="background:#f59e0b;color:#fff">Pending</span>';
    else badgeHtml = '<span class="badge badge-green">Confirmed</span>';

    return `
      <div class="card card-accent-top">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div style="font-family:'Sora',sans-serif;font-weight:700;font-size:.95rem">${bk.eventId?.title || 'Event'}</div>
          ${badgeHtml}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:.82rem;color:var(--text-secondary);margin-bottom:12px">
          <span>👤 ${bk.userId?.name || '—'} &lt;${bk.userId?.email || '—'}&gt;</span>
          <span>🎟 ${bk.seatsBooked} seats · ${fmtPrice(bk.totalPrice)}</span>
          <span>📅 ${fmtDate(bk.eventId?.date)}</span>
        </div>
        ${isPending ? `
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" style="flex:1;background:#10b981;border-color:#10b981" onclick="approveBooking('${bk._id}')">
              <span class="material-icons">check_circle</span> Approve
            </button>
            <button class="btn btn-danger btn-sm" style="flex:1" onclick="rejectBooking('${bk._id}')">
              <span class="material-icons">cancel</span> Reject
            </button>
          </div>
        ` : (!isCancelled ? `
          <button class="btn btn-danger btn-sm" style="width:100%" onclick="cancelBooking('${bk._id}')">
            <span class="material-icons">cancel</span> Cancel Booking
          </button>
        ` : '')}
      </div>
    `;
  }).join('');
}

async function loadBookings() {
  renderSkeletons('bookingsGrid', 4);
  try {
    const data = await apiGet(`/admin/bookings?page=${bookingsPage}&limit=12`);
    const { bookings, pages } = data;
    window.currentAdminBookings = bookings;
    
    renderBookingsList(bookings);
    renderPagination('bookingsPagination', bookingsPage, pages, p => { bookingsPage = p; loadBookings(); });
  } catch (err) {
    renderEmpty('bookingsGrid', 'error', 'Failed to load bookings', err.message);
  }
}

function filterAdminBookings() {
  const q = document.getElementById('adminBookingSearch').value.toLowerCase();
  if (!window.currentAdminBookings) return;
  if (!q) {
    renderBookingsList(window.currentAdminBookings);
    return;
  }
  const filtered = window.currentAdminBookings.filter(bk => {
    const name = (bk.userId?.name || '').toLowerCase();
    const email = (bk.userId?.email || '').toLowerCase();
    const title = (bk.eventId?.title || '').toLowerCase();
    return name.includes(q) || email.includes(q) || title.includes(q);
  });
  renderBookingsList(filtered);
}

async function cancelBooking(id) {
  const ok = await showConfirm('Cancel Booking', 'Seats will be restored to the event.');
  if (!ok) return;
  try {
    await apiDelete(`/admin/bookings/${id}`);
    showToast('Booking cancelled, seats restored', 'info');
    loadBookings();
    loadEvents();
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveBooking(id) {
  try {
    await apiPut(`/admin/bookings/${id}/approve`);
    showToast('Booking approved!', 'success');
    loadBookings();
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function rejectBooking(id) {
  const ok = await showConfirm('Reject Booking', 'Are you sure you want to reject this request? Seats will be returned.');
  if (!ok) return;
  try {
    await apiPut(`/admin/bookings/${id}/reject`);
    showToast('Booking rejected', 'info');
    loadBookings();
    loadEvents();
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportCSV() {
  const t = getToken();
  const a = document.createElement('a');
  a.href = `http://localhost:5000/api/admin/bookings/export`;
  // Use fetch to download with auth header
  try {
    const res = await fetch(a.href, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookings.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ────────────────────────────────
   USERS
──────────────────────────────── */
function renderUsersList(users) {
  const grid = document.getElementById('usersGrid');
  if (!users?.length) {
    renderEmpty('usersGrid', 'people', 'No users found');
    return;
  }
  grid.innerHTML = users.map(u => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:700;font-size:1.1rem;color:white;flex-shrink:0">
          ${u.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <div style="font-weight:700;font-size:.95rem;color:var(--text-primary)">${u.name}</div>
          <div style="font-size:.8rem;color:var(--text-muted)">${u.email}</div>
        </div>
      </div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:12px">Joined ${fmtDate(u.createdAt)}</div>
      <button class="btn btn-danger btn-sm" style="width:100%" onclick="deleteUser('${u._id}')">
        <span class="material-icons">person_remove</span> Remove User
      </button>
    </div>
  `).join('');
}

async function loadUsers() {
  renderSkeletons('usersGrid', 4);
  try {
    const users = await apiGet('/admin/users');
    window.currentAdminUsers = users;
    renderUsersList(users);
  } catch (err) {
    renderEmpty('usersGrid', 'error', 'Failed to load users', err.message);
  }
}

function filterAdminUsers() {
  const q = document.getElementById('adminUserSearch').value.toLowerCase();
  if (!window.currentAdminUsers) return;
  if (!q) {
    renderUsersList(window.currentAdminUsers);
    return;
  }
  const filtered = window.currentAdminUsers.filter(u => {
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });
  renderUsersList(filtered);
}

async function exportUsersCSV() {
  const t = getToken();
  const a = document.createElement('a');
  a.href = `http://localhost:5000/api/admin/users/export`;
  try {
    const res = await fetch(a.href, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Users CSV downloaded!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteUser(id) {
  const ok = await showConfirm('Remove User', 'All their bookings will be cancelled and seats restored.');
  if (!ok) return;
  try {
    await apiDelete(`/admin/users/${id}`);
    showToast('User removed', 'info');
    loadUsers();
    loadReports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openViewReviewsModal(reviews) {
  const listEl = document.getElementById('reviewsList');
  if (!reviews || reviews.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px 0;">No reviews yet.</div>';
  } else {
    listEl.innerHTML = reviews.map(r => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <strong style="color:var(--text-primary);font-size:0.95rem;">${r.userName || 'Anonymous'}</strong>
          <div style="color:var(--warning);font-size:0.85rem;display:flex;align-items:center;">
            ${Array.from({length: 5}).map((_, i) => `<span class="material-icons" style="font-size:14px;">${i < r.rating ? 'star' : 'star_outline'}</span>`).join('')}
          </div>
        </div>
        <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.4;margin:0;">${r.comment}</p>
        <div style="color:var(--text-muted);font-size:0.75rem;margin-top:8px;">${new Date(r.createdAt || Date.now()).toLocaleDateString()}</div>
      </div>
    `).join('');
  }
  document.getElementById('viewReviewsModal').classList.add('open');
}

function closeViewReviewsModal() {
  document.getElementById('viewReviewsModal').classList.remove('open');
}
