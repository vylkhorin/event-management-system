// js/user.js
ensureLoggedIn();

document.addEventListener("DOMContentLoaded", async () => {
  const nameEl = document.getElementById("userName");
  if (nameEl) {
    try {
      const me = await apiGet("/user/profile"); // { name, email, ... }
      nameEl.textContent = me.name || localStorage.getItem("name") || "User";
    } catch {
      nameEl.textContent = localStorage.getItem("name") || "User";
    }
  }

  if (document.getElementById("events")) loadEvents();
  if (document.getElementById("bookings")) loadBookings();
  if (document.getElementById("profName")) loadProfileForm();
});

async function loadEvents() {
  try {
    const events = await apiGet("/user/events");
    const wrap = document.getElementById("events");
    wrap.innerHTML = "";
    if (!events.length) {
      wrap.innerHTML = `<div class="card">No events available.</div>`;
      return;
    }
    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "card";
      const dateTxt = ev.date ? new Date(ev.date).toLocaleString() : "TBA";
      card.innerHTML = `
        <h3>${ev.title}</h3>
        <p class="muted">${ev.location || ""}</p>
        <p>${ev.description || ""}</p>
        <p class="muted">Date: ${dateTxt}</p>
        <p class="muted">Price: ${ev.price ?? 0} | Available: ${ev.availableSeats ?? "-"}</p>
        <div class="row">
          <input type="number" min="1" value="1" placeholder="Seats" id="seats-${ev._id}" />
          <button onclick="bookEvent('${ev._id}')">Book</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    alert(err.message);
  }
}

async function bookEvent(eventId) {
  const qty = Number(document.getElementById(`seats-${eventId}`).value || "1");
  if (qty < 1) return alert("Enter valid seats.");

  try {
    const data = await apiPost(`/user/book/${eventId}`, { seats: qty });
    alert("Booking successful.");
    loadEvents();
    loadBookings();
  } catch (err) {
    alert(err.message);
  }
}

async function loadBookings() {
  try {
    const bookings = await apiGet("/user/bookings");
    const wrap = document.getElementById("bookings");
    wrap.innerHTML = "";
    if (!bookings.length) {
      wrap.innerHTML = `<div class="card">No bookings yet.</div>`;
      return;
    }
    bookings.forEach(bk => {
      const d = bk.eventId?.date ? new Date(bk.eventId.date).toLocaleString() : "TBA";
      const title = bk.eventId?.title || "Event";
      const price = bk.totalPrice ?? (bk.seatsBooked * (bk.eventId?.price ?? 0));
      const status = bk.paymentStatus || "paid";
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${title}</h3>
        <p class="muted">Seats: ${bk.seatsBooked} • Total: ${price}</p>
        <p class="muted">Status: ${status}</p>
        <p class="muted">Date: ${d}</p>
        <a href="#">View receipt</a>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    alert(err.message);
  }
}

// PROFILE
async function loadProfileForm() {
  try {
    const me = await apiGet("/user/profile");
    document.getElementById("profName").value = me.name || "";
    document.getElementById("profEmail").value = me.email || "";
  } catch (err) {
    alert(err.message);
  }
}

async function updateProfile() {
  const name = document.getElementById("profName").value.trim();
  try {
    const res = await apiPut("/user/profile", { name });
    localStorage.setItem("name", res.user?.name || name || "User");
    alert(res.message || "Profile updated.");
  } catch (err) {
    alert(err.message);
  }
}
