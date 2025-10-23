const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {

})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));








// // Import dependencies
// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// require('dotenv').config();

// // Initialize app
// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors()); // Allow cross-origin requests
// app.use(bodyParser.json()); // Parse JSON request bodies
// app.use(bodyParser.urlencoded({ extended: true }));


// // Routes (placeholders)
// app.get('/', (req, res) => {
//     res.send('Event Management System API Running');
// });


// const authRoutes = require('./routes/auth');  // Auth Routes
// app.use('/api/auth', authRoutes);

// const adminRoutes = require('./routes/admin'); // Admin Routes
// app.use('/api/admin', adminRoutes);


// const userRoutes = require('./routes/user'); // User Routes
// app.use('/api/user', userRoutes);



// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB Connected"))
// .catch((err) => console.error("MongoDB Connection Error:", err));



// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`); // Start Server
// });
