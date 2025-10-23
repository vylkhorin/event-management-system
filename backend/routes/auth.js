const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Register a new user/admin
router.post('/register', register);

// Login user/admin
router.post('/login', login);

module.exports = router;








// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// require('dotenv').config();

// // @route   POST /api/auth/register
// // @desc    Register a new user
// router.post('/register', async (req, res) => {
//     const { name, email, password, role } = req.body;

//     try {
//         // Check if user exists
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(400).json({ message: 'User already exists' });
//         }

//         // Create new user
//         const user = await User.create({ name, email, password, role });

//         // Generate JWT token
//         const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

//         res.status(201).json({
//             message: 'User registered successfully',
//             user: { id: user._id, name: user.name, email: user.email, role: user.role },
//             token
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // @route   POST /api/auth/login
// // @desc    Login user
// router.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         // Find user
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(400).json({ message: 'Invalid email or password' });
//         }

//         // Check password
//         const isMatch = await user.matchPassword(password);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Invalid email or password' });
//         }

//         // Generate JWT token
//         const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

//         res.status(200).json({
//             message: 'Login successful',
//             user: { id: user._id, name: user.name, email: user.email, role: user.role },
//             token
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// module.exports = router;
