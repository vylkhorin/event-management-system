// js/admin.js
ensureAdmin();

let editingEventId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadReports();
  await loadEvents();
  await loadBookings();
});

function resetEventForm() {
  editingEventId = null;
  document.getElementById("evTitle").value = "";
  document.getElementById("evLocation").value = "";
  document.getElementById("evDate").value = "";
  document.getElementById("evDesc").value = "";
  document.getElementById("evTotal").value = "";
  document.getElementById("evPrice").value = "";
  document.getElementById("editHint").textContent = "";
  document.getElementById("eventSubmitBtn").textContent = "Create Event";
}

async function createOrUpdateEvent() {
  const payload = {
    title: document.getElementById("evTitle").value.trim(),
    description: document.getElementById("evDesc").value.trim(),
    location: document.getElementById("evLocation").value.trim(),
    date: document.getElementById("evDate").value ? new Date(document.getElementById("evDate").value).toISOString() : null,
    totalSeats: Number(document.getElementById("evTotal").value || 0),
    price: Number(document.getElementById("evPrice").value || 0),
  };
  if (!payload.title || !payload.date) return alert("Title and date are required.");

  try {
    if (editingEventId) {
      await apiPut(`/admin/events/${editingEventId}`, payload);
      alert("Event updated.");
    } else {
      await apiPost("/admin/events", payload);
      alert("Event created.");
    }
    resetEventForm();
    loadEvents();
  } catch (err) {
    alert(err.message);
  }
}

async function loadEvents() {
  try {
    const events = await apiGet("/admin/events");
    const wrap = document.getElementById("events");
    wrap.innerHTML = "";
    if (!events.length) {
      wrap.innerHTML = `<div class="card">No events.</div>`;
      return;
    }
    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "card";
      const dateTxt = ev.date ? new Date(ev.date).toLocaleString() : "TBA";
      card.innerHTML = `
        <h3>${ev.title}</h3>
        <p>${ev.description || ""}</p>
        <p class="small">Location: ${ev.location || "-"}</p>
        <p class="small">Date: ${dateTxt}</p>
        <p class="small">Total: ${ev.totalSeats ?? "-"} | Available: ${ev.availableSeats ?? "-"}</p>
        <p class="small">Price: ${ev.price ?? "-"}</p>
        <div class="row">
          <button class="secondary" onclick='startEdit(${JSON.stringify(ev).replace(/'/g,"&#39;")})'>Edit</button>
          <button class="danger" onclick="deleteEvent('${ev._id}')">Delete</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    alert(err.message);
  }
}

function startEdit(ev) {
  editingEventId = ev._id;
  document.getElementById("evTitle").value = ev.title || "";
  document.getElementById("evLocation").value = ev.location || "";
  document.getElementById("evDate").value = ev.date ? new Date(ev.date).toISOString().slice(0,16) : "";
  document.getElementById("evDesc").value = ev.description || "";
  document.getElementById("evTotal").value = ev.totalSeats ?? "";
  document.getElementById("evPrice").value = ev.price ?? "";
  document.getElementById("editHint").textContent = `Editing: ${ev.title}`;
  document.getElementById("eventSubmitBtn").textContent = "Save Changes";
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  try {
    await apiDelete(`/admin/events/${id}`);
    loadEvents();
  } catch (err) {
    alert(err.message);
  }
}

async function loadBookings() {
  try {
    const list = await apiGet("/admin/bookings");
    const wrap = document.getElementById("bookings");
    wrap.innerHTML = "";
    if (!list.length) {
      wrap.innerHTML = `<div class="card">No bookings yet.</div>`;
      return;
    }
    list.forEach(bk => {
      const d = bk.eventId?.date ? new Date(bk.eventId.date).toLocaleString() : "TBA";
      const title = bk.eventId?.title || "Event";
      const user = bk.userId?.name || "User";
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${title}</h3>
        <p class="small">By: ${user} (${bk.userId?.email || "-"})</p>
        <p class="small">Seats: ${bk.seatsBooked} | Total: ${bk.totalPrice ?? "-"}</p>
        <p class="small">Payment: ${bk.paymentStatus || "paid"} | Date: ${d}</p>
        <div class="row">
          <button class="danger" onclick="cancelBooking('${bk._id}')">Cancel</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    alert(err.message);
  }
}

async function cancelBooking(id) {
  if (!confirm("Cancel this booking? Seats will be restored.")) return;
  try {
    await apiDelete(`/admin/bookings/${id}`);
    loadBookings();
    loadEvents(); // refresh availability
  } catch (err) {
    alert(err.message);
  }
}

async function loadReports() {
  try {
    const rep = await apiGet("/admin/reports");
    const el = document.getElementById("reportSummary");
    el.textContent = `Users: ${rep.totalUsers} • Events: ${rep.totalEvents} • Bookings: ${rep.totalBookings} • Revenue: ${rep.totalRevenue}`;
  } catch {
    // keep default text
  }
}
