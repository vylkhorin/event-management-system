const API = 'http://localhost:5000/api';

async function runTests() {
  try {
    console.log('--- Starting API Tests ---');

    // 1. Register User
    const ts = Date.now();
    const userEmail = `testuser${ts}@example.com`;
    let res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name: `Test User ${ts}`, email: userEmail, password: 'password', role: 'user' })
    });
    let data = await res.json();
    if (!res.ok) throw new Error('User Register failed: ' + JSON.stringify(data));
    const userToken = data.token;
    console.log('✅ User Registration passed');

    // 2. Register Admin
    const adminEmail = `testadmin${ts}@example.com`;
    res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name: `Test Admin ${ts}`, email: adminEmail, password: 'password', role: 'admin' })
    });
    data = await res.json();
    if (!res.ok) throw new Error('Admin Register failed: ' + JSON.stringify(data));
    const adminToken = data.token;
    console.log('✅ Admin Registration passed');

    // 3. Admin Creates Event
    const formData = new FormData();
    formData.append('title', 'Test API Event');
    formData.append('description', 'Test Description');
    formData.append('date', new Date(Date.now() + 86400000).toISOString());
    formData.append('location', 'Test Location');
    formData.append('category', 'Tech');
    formData.append('totalSeats', '100');
    formData.append('price', '500');

    res = await fetch(`${API}/admin/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData // Node 22 global fetch handles FormData automatically
    });
    data = await res.json();
    if (!res.ok) throw new Error('Admin Create Event failed: ' + JSON.stringify(data));
    const eventId = data.event._id;
    console.log('✅ Admin Event Creation passed');

    // 4. User Books Event with payment details and selectedSeats
    res = await fetch(`${API}/user/book/${eventId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ selectedSeats: ['A1', 'A2'], paymentMethod: 'upi' })
    });
    data = await res.json();
    if (!res.ok) throw new Error('User Book Event failed: ' + JSON.stringify(data));
    const bookingId = data.booking._id;
    const txId = data.booking.transactionId;
    if (!txId) throw new Error('Transaction ID missing from booking');
    console.log('✅ User Booking (with selected seats) passed. TX ID: ' + txId);

    // 5. Admin Approves Booking
    res = await fetch(`${API}/admin/bookings/${bookingId}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    data = await res.json();
    if (!res.ok) throw new Error('Admin Approve Booking failed: ' + JSON.stringify(data));
    console.log('✅ Admin Booking Approval passed');

    // 6. User Gets Booking (Receipt test)
    res = await fetch(`${API}/user/bookings/${bookingId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    data = await res.json();
    if (!res.ok) throw new Error('User Get Booking failed: ' + JSON.stringify(data));
    if (data.status !== 'confirmed') throw new Error('Booking status is not confirmed');
    if (data.paymentMethod !== 'upi') throw new Error('Payment method mismatch');
    if (data.transactionId !== txId) throw new Error('Transaction ID mismatch');
    console.log('✅ User Receipt Data Check passed');

    // 7. User leaves a review
    res = await fetch(`${API}/user/events/${eventId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ rating: 5, comment: 'Great event!' })
    });
    data = await res.json();
    if (!res.ok) throw new Error('User Review failed: ' + JSON.stringify(data));
    console.log('✅ User Event Review passed');

    // 8. Global Logout (token version invalidation test)
    res = await fetch(`${API}/auth/logout-all`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    data = await res.json();
    if (!res.ok) throw new Error('Global Logout failed: ' + JSON.stringify(data));
    console.log('✅ Global Logout Check passed');

    // Verify token is now invalid
    res = await fetch(`${API}/user/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (res.ok) throw new Error('Token should be invalid after global logout');
    console.log('✅ Old Token Invalidation Check passed');

    console.log('\\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (e) {
    console.error('❌ Test failed:', e.stack);
  }
}

runTests();
