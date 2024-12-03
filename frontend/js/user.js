// js/user.js — User dashboard logic
ensureLoggedIn();

const CATEGORIES = ['All', 'Music', 'Tech', 'Sports', 'Art', 'Business', 'Food', 'Health', 'Education', 'Other'];

let currentEventsPage = 1;
let currentBookingsPage = 1;
let searchTimeout = null;
let activeCategory = 'All';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  // Set username in header
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = getName() || 'User';

  // Build category chips
  const chipsEl = document.getElementById('categoryChips');
  if (chipsEl) {
    chipsEl.innerHTML = CATEGORIES.map(c =>
      `<button class="chip ${c === 'All' ? 'active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    chipsEl.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      chipsEl.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      currentEventsPage = 1;
      loadEvents();
    });
  }

  // Search input with debounce
  const searchEl = document.getElementById('eventSearch');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = searchEl.value.trim();
        currentEventsPage = 1;
        loadEvents();
      }, 400);
    });
  }

  await loadEvents();
  await loadBookings();
});

/* ────────────────────────────────
   EVENTS
──────────────────────────────── */
async function loadEvents() {
  renderSkeletons('eventsGrid', 6);

  try {
    const params = new URLSearchParams({ page: currentEventsPage, limit: 9 });
    if (searchQuery) params.set('search', searchQuery);
    if (activeCategory && activeCategory !== 'All') params.set('category', activeCategory);

    const data = await apiGet(`/user/events?${params}`);
    const { events, pages } = data;
    const grid = document.getElementById('eventsGrid');

    if (!events || !events.length) {
      renderEmpty('eventsGrid', 'event_busy', 'No events found', 'Try adjusting your search or filter');
    } else {
      grid.innerHTML = events.map(ev => renderEventCard(ev)).join('');
    }

    renderPagination('eventsPagination', currentEventsPage, pages, (p) => {
      currentEventsPage = p;
      loadEvents();
      document.getElementById('eventsSection')?.scrollIntoView({ behavior: 'smooth' });
    });
  } catch (err) {
    renderEmpty('eventsGrid', 'error', 'Failed to load events', err.message);
  }
}

function renderEventCard(ev) {
  const seatsLeft = ev.availableSeats;
  const seatClass = seatsLeft === 0 ? 'sold' : seatsLeft <= 5 ? 'low' : '';
  const seatText  = seatsLeft === 0 ? 'Sold Out' : `${seatsLeft} seats left`;
  const imgContent = ev.imageUrl
    ? `<img src="http://localhost:5000${ev.imageUrl}" alt="${ev.title}" style="width:100%;height:100%;object-fit:cover"/>`
    : `<span class="material-icons">event</span>`;

  const ratingHtml = ev.averageRating > 0 
    ? `<div style="color:var(--warning);font-size:0.85rem;display:flex;align-items:center;gap:4px;cursor:pointer;transition:0.2s" onclick='openViewReviewsModal(${JSON.stringify(ev.reviews).replace(/'/g, "&#39;")})' onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"><span class="material-icons" style="font-size:16px;">star</span> ${ev.averageRating.toFixed(1)} (${ev.reviews?.length || 0})</div>` 
    : `<div style="font-size:0.8rem;color:var(--text-muted)">No reviews</div>`;
  
  return `
    <div class="event-card">
      <div class="event-card-img">${imgContent}</div>
      <div class="event-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          ${categoryBadge(ev.category)}
          <span class="event-card-seats ${seatClass}">${seatText}</span>
        </div>
        <div class="event-card-title" style="display:flex;justify-content:space-between;align-items:flex-start;">
          <span>${ev.title}</span>
          ${ratingHtml}
        </div>
        <div class="event-card-meta">
          <div class="event-card-meta-item">
            <span class="material-icons">schedule</span>
            ${fmtDateTime(ev.date)}
          </div>
          <div class="event-card-meta-item">
            <span class="material-icons">location_on</span>
            ${ev.location}
          </div>
        </div>
        ${ev.description ? `<p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:10px;line-height:1.5">${ev.description.slice(0,80)}${ev.description.length>80?'…':''}</p>` : ''}
        <div class="event-card-footer">
          <div class="event-card-price">${fmtPrice(ev.price)}</div>
        </div>
        ${seatsLeft > 0 ? `
          <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick='openSeatModal(${JSON.stringify(ev).replace(/'/g, "&#39;")})'>
            <span class="material-icons">event_seat</span> Select Seats
          </button>
        ` : `<button class="btn btn-secondary" style="width:100%;margin-top:14px" disabled>Sold Out</button>`}
      </div>
    </div>
  `;
}

let currentPaymentEventId = null;
let currentPaymentEventPrice = 0;
let selectedSeats = [];

function openSeatModal(event) {
  currentPaymentEventId = event._id;
  currentPaymentEventPrice = event.price;
  selectedSeats = [];
  document.getElementById('seatCountLabel').textContent = '0';
  document.getElementById('confirmSeatsBtn').disabled = true;
  
  const grid = document.getElementById('seatGrid');
  grid.innerHTML = '';
  
  const total = event.totalSeats;
  const booked = event.bookedSeats || [];
  
  // Assume 10 seats per row
  for (let i = 0; i < total; i++) {
    const row = String.fromCharCode(65 + Math.floor(i / 10)); // A, B, C...
    const num = (i % 10) + 1;
    const seatId = `${row}${num}`;
    
    const isBooked = booked.includes(seatId);
    
    const seat = document.createElement('div');
    seat.className = `seat ${isBooked ? 'booked' : ''}`;
    seat.textContent = seatId;
    
    if (!isBooked) {
      seat.onclick = () => toggleSeat(seat, seatId);
    }
    
    grid.appendChild(seat);
  }
  
  document.getElementById('seatModal').classList.add('open');
}

function toggleSeat(seatElement, seatId) {
  if (selectedSeats.includes(seatId)) {
    selectedSeats = selectedSeats.filter(s => s !== seatId);
    seatElement.classList.remove('selected');
  } else {
    selectedSeats.push(seatId);
    seatElement.classList.add('selected');
  }
  
  const count = selectedSeats.length;
  document.getElementById('seatCountLabel').textContent = count;
  document.getElementById('confirmSeatsBtn').disabled = count === 0;
}

function closeSeatModal() {
  document.getElementById('seatModal').classList.remove('open');
}

function confirmSeats() {
  closeSeatModal();
  
  const qty = selectedSeats.length;
  document.getElementById('paySeats').textContent = selectedSeats.join(', ');
  document.getElementById('payTotal').textContent = fmtPrice(currentPaymentEventPrice * qty);
  document.getElementById('paymentModal').classList.add('open');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('open');
  document.getElementById('paymentForm').reset();
  togglePaymentFields();
  currentPaymentEventId = null;
}

function togglePaymentFields() {
  const method = document.getElementById('payMethod').value;
  document.getElementById('cardFields').style.display = method === 'credit_card' ? 'block' : 'none';
  document.getElementById('upiFields').style.display = method === 'upi' ? 'block' : 'none';
  document.getElementById('bankFields').style.display = method === 'bank_transfer' ? 'block' : 'none';
}

async function submitPayment(e) {
  e.preventDefault();
  const method = document.getElementById('payMethod').value;
  const btn = document.querySelector('#paymentForm button[type="submit"]');
  
  // Basic validation just to simulate a real gateway
  if (method === 'credit_card' && document.getElementById('cardNumber').value.length < 10) {
    showToast('Please enter a valid card number', 'warning'); return;
  }
  if (method === 'upi' && !document.getElementById('upiId').value.includes('@')) {
    showToast('Please enter a valid UPI ID', 'warning'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite">refresh</span> Processing...';

  try {
    await apiPost(`/user/book/${currentPaymentEventId}`, { 
        selectedSeats: selectedSeats, 
        paymentMethod: method 
    });
    showToast('Payment successful! Booking requested.', 'success');
    closePaymentModal();
    loadEvents();
    loadBookings();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons">lock</span> Pay & Request Booking';
  }
}

/* ────────────────────────────────
   BOOKINGS
──────────────────────────────── */
async function loadBookings() {
  renderSkeletons('bookingsGrid', 3);
  try {
    const data = await apiGet(`/user/bookings?page=${currentBookingsPage}&limit=6`);
    const { bookings, pages } = data;
    const grid = document.getElementById('bookingsGrid');

    if (!bookings || !bookings.length) {
      renderEmpty('bookingsGrid', 'bookmark_border', 'No bookings yet', 'Browse events and book your first one!');
    } else {
      grid.innerHTML = bookings.map(bk => renderBookingCard(bk)).join('');
    }

    renderPagination('bookingsPagination', currentBookingsPage, pages, (p) => {
      currentBookingsPage = p;
      loadBookings();
    });
  } catch (err) {
    renderEmpty('bookingsGrid', 'error', 'Failed to load bookings', err.message);
  }
}

function renderBookingCard(bk) {
  const ev = bk.eventId;
  const isCancelled = bk.status === 'cancelled';
  const isPending = bk.status === 'pending';
  
  let badgeHtml = '';
  if (isCancelled) badgeHtml = '<span class="badge badge-gray">Cancelled</span>';
  else if (isPending) badgeHtml = '<span class="badge" style="background:#f59e0b;color:#fff">Pending Approval</span>';
  else badgeHtml = '<span class="badge badge-green">Confirmed</span>';

  return `
    <div class="card card-accent-top" style="opacity:${isCancelled ? 0.6 : 1}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-family:'Sora',sans-serif;font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:4px">${ev?.title || 'Event'}</div>
          ${categoryBadge(ev?.category)}
        </div>
        ${badgeHtml}
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px">
        <div class="event-card-meta-item" style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-secondary)">
          <span class="material-icons" style="font-size:14px;color:var(--primary-light)">schedule</span>
          ${fmtDateTime(ev?.date)}
        </div>
        <div class="event-card-meta-item" style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-secondary)">
          <span class="material-icons" style="font-size:14px;color:var(--primary-light)">location_on</span>
          ${ev?.location || '—'}
        </div>
        <div class="event-card-meta-item" style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:var(--text-secondary)">
          <span class="material-icons" style="font-size:14px;color:var(--primary-light)">confirmation_number</span>
          ${bk.seatsBooked} seat${bk.seatsBooked > 1 ? 's' : ''} · ${fmtPrice(bk.totalPrice)}
        </div>
      </div>
      ${!isCancelled ? `
        <div style="display:flex;gap:8px;width:100%;flex-wrap:wrap;">
          ${!isPending ? `
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="downloadReceipt('${bk._id}')">
              <span class="material-icons">receipt_long</span> Receipt
            </button>
            <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openReviewModal('${ev._id}')">
              <span class="material-icons">star_rate</span> Review
            </button>
          ` : ''}
          <button class="btn btn-danger btn-sm" style="${isPending ? 'width:100%' : 'width:100%'}" onclick="cancelBooking('${bk._id}')">
            <span class="material-icons">cancel</span> Cancel ${isPending ? 'Request' : 'Booking'}
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

async function cancelBooking(bookingId) {
  const confirmed = await showConfirm('Cancel Booking', 'Are you sure? Your seats will be released.');
  if (!confirmed) return;
  try {
    await apiDelete(`/user/bookings/${bookingId}`);
    showToast('Booking cancelled', 'info');
    loadBookings();
    loadEvents(); // refresh seat counts
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ────────────────────────────────
   REVIEWS
──────────────────────────────── */
let currentReviewEventId = null;

function openReviewModal(eventId) {
  currentReviewEventId = eventId;
  document.getElementById('reviewRating').value = 0;
  document.getElementById('reviewComment').value = '';
  document.querySelectorAll('#starContainer .material-icons').forEach(s => {
    s.textContent = 'star_outline';
    s.style.color = 'var(--text-muted)';
  });
  document.getElementById('reviewModal').classList.add('open');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('open');
  currentReviewEventId = null;
}

document.querySelectorAll('#starContainer .material-icons').forEach(star => {
  star.addEventListener('click', (e) => {
    const val = Number(e.target.dataset.val);
    document.getElementById('reviewRating').value = val;
    document.querySelectorAll('#starContainer .material-icons').forEach(s => {
      if (Number(s.dataset.val) <= val) {
        s.textContent = 'star';
        s.style.color = 'var(--warning)';
      } else {
        s.textContent = 'star_outline';
        s.style.color = 'var(--text-muted)';
      }
    });
  });
});

async function submitReview(e) {
  e.preventDefault();
  const rating = Number(document.getElementById('reviewRating').value);
  const comment = document.getElementById('reviewComment').value;
  
  if (rating === 0) {
    showToast('Please select a star rating', 'warning');
    return;
  }
  
  const btn = document.querySelector('#reviewForm button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite">refresh</span> Submitting...';
  
  try {
    await apiPost(`/user/events/${currentReviewEventId}/review`, { rating, comment });
    showToast('Thank you for your review!', 'success');
    closeReviewModal();
    loadEvents(); // refresh to show new rating
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Submit Review';
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

async function downloadReceipt(bookingId) {
  try {
    const data = await apiGet(`/user/bookings/${bookingId}`);
    
    // Create a beautiful HTML receipt
    // Create a beautiful HTML receipt
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt - ${data.transactionId || 'N/A'}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 650px; margin: 0 auto; }
            .receipt-box { border: 1px solid #ddd; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative; overflow: hidden; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
            .status-badge { background: #10b981; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-block { font-size: 14px; }
            .info-block strong { color: #7f8c8d; display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #f8f9fa; color: #7f8c8d; border-bottom: 2px solid #eee; font-size: 13px; text-transform: uppercase; }
            td { padding: 15px 12px; border-bottom: 1px solid #eee; font-size: 15px; }
            .text-right { text-align: right; }
            .total-row td { font-weight: bold; font-size: 18px; color: #2c3e50; border-bottom: none; border-top: 2px solid #eee; padding-top: 20px; }
            
            /* Signature & Seal */
            .auth-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; margin-bottom: 20px; }
            .signature-box { text-align: center; }
            .signature-line { width: 180px; border-bottom: 1px solid #333; margin-bottom: 8px; }
            .signature-text { font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; font-size: 28px; color: #2c3e50; transform: rotate(-5deg) translateY(10px); }
            
            .seal { width: 100px; height: 100px; border: 3px double #e74c3c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #e74c3c; font-weight: bold; font-size: 12px; text-align: center; text-transform: uppercase; transform: rotate(-15deg); opacity: 0.8; }
            .seal-inner { border: 1px solid #e74c3c; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; flex-direction: column; }

            .footer { text-align: center; font-size: 13px; color: #95a5a6; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #eee; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div>
                <div class="title">Payment Receipt</div>
                <div style="color:#7f8c8d;font-size:14px">Transaction ID: <strong>${data.transactionId || 'N/A'}</strong></div>
              </div>
              <div style="display:flex;align-items:center;gap:20px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${data._id}" alt="QR" style="border:1px solid #eee;border-radius:4px;padding:4px;background:#fff" />
                <div class="status-badge">Paid</div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-block">
                <strong>Event</strong>
                <div>${data.event}</div>
              </div>
              <div class="info-block">
                <strong>Date & Time</strong>
                <div>${new Date(data.date).toLocaleString()}</div>
              </div>
              <div class="info-block">
                <strong>Location</strong>
                <div>${data.location}</div>
              </div>
              <div class="info-block">
                <strong>Payment Method</strong>
                <div style="text-transform:capitalize">${(data.paymentMethod || 'credit_card').replace('_', ' ')}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ticket(s) for ${data.event}</td>
                  <td class="text-right">${data.seatsBooked}</td>
                  <td class="text-right">$${data.pricePerSeat ? data.pricePerSeat.toLocaleString() : '0'}</td>
                  <td class="text-right">$${data.totalAmount ? data.totalAmount.toLocaleString() : '0'}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" class="text-right">Total Paid</td>
                  <td class="text-right" style="color:#10b981">$${data.totalAmount ? data.totalAmount.toLocaleString() : '0'}</td>
                </tr>
              </tbody>
            </table>

            <div class="auth-section">
              <div class="seal">
                <div class="seal-inner">
                  <span>EventHub</span>
                  <span style="font-size:8px;margin-top:4px">Verified</span>
                </div>
              </div>
              <div class="signature-box">
                <div class="signature-text">EventHub Admin</div>
                <div class="signature-line"></div>
                <div style="font-size:12px;color:#7f8c8d;text-transform:uppercase">Authorized Signature</div>
              </div>
            </div>

            <div class="footer">
              Thank you for your booking! This is an electronically generated formal receipt.
            </div>
          </div>
        </body>
      </html>
    `;

    // Create a Blob and open it in a new window to print/save
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.print();
      };
    } else {
      showToast('Popup blocked. Cannot open receipt.', 'warning');
    }
  } catch (err) {
    showToast('Failed to download receipt', 'error');
  }
}

/* ────────────────────────────────
   PROFILE (used on profile.html)
──────────────────────────────── */
async function loadProfileForm() {
  try {
    const me = await apiGet('/user/profile');
    const nameEl  = document.getElementById('profName');
    const emailEl = document.getElementById('profEmail');
    if (nameEl)  nameEl.value  = me.name  || '';
    if (emailEl) emailEl.value = me.email || '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateProfile() {
  const name  = document.getElementById('profName')?.value.trim();
  const email = document.getElementById('profEmail')?.value.trim();
  if (!name) { showToast('Name cannot be empty', 'warning'); return; }
  try {
    const res = await apiPut('/user/profile', { name, email });
    localStorage.setItem('name', res.user?.name || name);
    showToast('Profile updated!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updatePassword() {
  const oldPwd = document.getElementById('oldPassword')?.value;
  const newPwd = document.getElementById('newPassword')?.value;
  const cfmPwd = document.getElementById('cfmPassword')?.value;
  if (!oldPwd || !newPwd) { showToast('Fill in all password fields', 'warning'); return; }
  if (newPwd !== cfmPwd)  { showToast('New passwords do not match', 'error'); return; }
  try {
    await apiPut('/user/profile/password', { oldPassword: oldPwd, newPassword: newPwd });
    showToast('Password changed successfully!', 'success');
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('cfmPassword').value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}
