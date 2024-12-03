# Event Management System (EventHub)

A full-stack web application for discovering, booking, and managing events. Features role-based access control (Admin/User), real-time seat availability, image uploads, analytics dashboards, and a unified modern UI.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
1. **[Node.js](https://nodejs.org/)** (v16.x or higher)
# 🎉 EventHub - Modern Event Management System

EventHub is a premium, full-stack, state-of-the-art Event Management System built with Node.js, Express, MongoDB, and Vanilla JavaScript/CSS. It features a complete administrative backend to manage events, track revenue, and monitor bookings, combined with a gorgeous, responsive, user-facing frontend that includes an interactive seat selection map, QR code receipts, and a dynamic Dark/Light mode engine.

## 🌟 Key Features

### User Functionality
- **Interactive Seat Map:** Visual representation of event layouts. Users can selectively pick empty seats (e.g. A1, B3).
- **Ratings & Reviews:** Users can leave 1-5 star ratings and written reviews for events they have successfully attended.
- **QR Code Receipts:** Beautiful, professional-grade HTML invoice downloads featuring dynamic QR Codes for event entry.
- **Profile Management:** Users can update their name, email, and password securely.
- **Dynamic Theming:** Seamless global Dark Mode and Light Mode switching, persisting via LocalStorage.
- **Smart Searching:** Live, debounced search filtering for events by name, location, and category.

### Admin Functionality
- **Data Dashboards:** Rich statistical overviews using `Chart.js` for "Revenue per Event" and "Last 30 Days Trend".
- **Event Management:** Full CRUD capabilities with image uploading (via `multer`) and capacity constraints.
- **Booking Approvals:** Admins manually approve "Pending" bookings and payments. Approving a booking secures the seat, rejecting it refunds/releases the seat back to the pool.
- **User Management:** Instant real-time filtering of the user base. Deleting a user automatically purges and refunds their associated bookings.
- **Data Export:** Admins can export both Bookings and Registered Users into downloadable `.csv` spreadsheet files.
- **Global Logout:** A "Sign out from all sessions" mechanism powered by an internal `tokenVersion` schema, killing all active JWTs instantly.

---

## 🏗 Architecture & Workflow

The project follows a standard **Client-Server Architecture** utilizing the MVC (Model-View-Controller) design pattern on the backend.

1. **Frontend (Client):** A pure HTML/CSS/Vanilla JS Single Page Application (SPA) architecture utilizing native `fetch()` calls. It relies on a global `theme.css` design system utilizing modern CSS variables for rapid theme switching and consistent UI components (cards, buttons, modals, badges).
2. **Backend (Server):** An Express.js REST API handling all business logic, seat concurrency, authentication, and file storage.
3. **Database:** A NoSQL MongoDB database managed via Mongoose ODMs, providing flexible schemas and robust data atomic operations (like `$push` and `$inc`).

### Workflow Example (Booking an Event)
1. User browses to an event and clicks "Select Seats". The client fetches the `bookedSeats` array.
2. User selects seats visually. Proceeding opens the payment modal.
3. User enters mocked payment details and confirms.
4. The system validates the seats are still empty using atomic MongoDB queries, reserves the seats, and creates a "Pending" Booking.
5. The Admin sees the Pending booking, clicks "Approve". 
6. The User's booking is marked "Confirmed", allowing them to download a QR-Code stamped receipt and (post-event) leave a 5-star Review.

---

## 🗄️ Database Models

Built using `Mongoose` schemas.

### 1. User Model
Tracks the user's core identity and role.
- `name` (String)
- `email` (String, Unique)
- `password` (String, hashed via `bcryptjs`)
- `role` (Enum: `user` or `admin`)
- `tokenVersion` (Number) - Increments on "Sign out all sessions" to instantly invalidate old JWT tokens.

### 2. Event Model
Houses all information about an individual event, including sub-documents for reviews.
- `title`, `description`, `location`, `category` (Strings)
- `date` (Date)
- `totalSeats`, `availableSeats`, `price` (Numbers)
- `imageUrl` (String) - Path to the Multer-uploaded image file.
- `bookedSeats` (Array of Strings) - e.g., `["A1", "B4"]` used to render the visual seat map.
- `reviews` (Array of Objects) - Sub-documents holding `userId`, `userName`, `rating`, `comment`, and `createdAt`.
- `averageRating` (Number) - Auto-calculated upon review submission.

### 3. Booking Model
Links Users to Events and tracks the payment/approval lifecycle.
- `userId` (ObjectId, ref: `User`)
- `eventId` (ObjectId, ref: `Event`)
- `seatsBooked` (Number)
- `selectedSeats` (Array of Strings)
- `totalPrice` (Number)
- `paymentMethod` (String)
- `transactionId` (String) - Generated sequentially.
- `status` (Enum: `pending`, `confirmed`, `cancelled`)
- `paymentStatus` (Enum: `pending`, `paid`, `cancelled`)

---

## 📂 Project Structure

```text
event-management-system/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── adminController.js    # Admin logic (CRUD, Reports, Approvals)
│   │   ├── authController.js     # Login, Register, Global Logout
│   │   └── userController.js     # Browsing, Booking, Reviews, Profile
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT validation and Role checks
│   ├── models/
│   │   ├── Booking.js
│   │   ├── Event.js
│   │   └── User.js
│   ├── routes/
│   │   ├── admin.js              # /api/admin/*
│   │   ├── auth.js               # /api/auth/*
│   │   └── user.js               # /api/user/*
│   └── server.js                 # Express bootstrap and middleware
├── frontend/
│   ├── css/
│   │   └── theme.css             # Unified Design System (Variables, Dark Mode)
│   ├── js/
│   │   ├── main.js               # Shared API wrappers, theme toggle, and UI toasts
│   │   ├── admin.js              # Admin Dashboard logic
│   │   ├── user.js               # User Dashboard logic
│   │   └── auth.js               # Registration and Login logic
│   ├── index.html                # Landing Redirector
│   ├── login.html                
│   ├── register.html             
│   ├── admin.html                # Admin Dashboard UI
│   ├── user.html                 # User Dashboard UI
│   └── profile.html              # User Profile Management
├── uploads/                      # Local file storage for Event images
├── .env                          # Environment variables (JWT_SECRET, MONGO_URI)
├── .gitignore
├── package.json
└── test.js                       # End-to-End API Integration Tests
```

---

## 🚀 Setup and Run Instructions

### Prerequisites
- Node.js (v22+)
- MongoDB (Running locally on `mongodb://127.0.0.1:27017` or via MongoDB Atlas)

### Installation
1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:** Ensure your `.env` file is populated. (e.g., `PORT=5000`, `MONGO_URI=mongodb://127.0.0.1:27017/eventhub`, `JWT_SECRET=supersecret`).

### Running the Application
To start the application in development mode (using `nodemon` and a local HTTP server for the frontend):
```bash
npm run dev
```
- **Backend API** will run on `http://localhost:5000`
- **Frontend App** will run on `http://localhost:8080` (handled automatically via `http-server`)

Visit `http://localhost:8080` in your browser.

### Running Tests
To verify the system integrity, you can run the automated testing script:
```bash
node test.js
```
This executes a full End-to-End simulation (Registration -> Event Creation -> Specific Seat Selection -> Payment -> Admin Approval -> PDF Receipt Verification -> 5-Star Review -> Global Logout) and outputs the results in the terminal.

---

## 🎨 Design Philosophy
The system utilizes a custom, heavily modernized design system. We explicitly avoided bloated CSS frameworks in favor of native CSS Custom Properties (`var(--primary)`), CSS Grid, and Flexbox. This ensures the application remains incredibly fast, the bundle size remains near zero, and the aesthetic feels premium with glassmorphism touches, micro-animations, and dynamic real-time search filtering.
