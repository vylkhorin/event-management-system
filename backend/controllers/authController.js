const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user/admin
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {


    try {
        const { name, email, password, role } = req.body;
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = await User.create({ name, email, password, role });

        // Generate JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// // @desc    Login user/admin
// // @route   POST /api/auth/login
// // @access  Public
// // exports.login = async (req, res) => {

// //     try {
// //         const { email, password } = req.body;
// //         // Find user
// //         const user = await User.findOne({ email });
// //         if (!user) {
// //             return res.status(400).json({ message: 'Invalid email or password' });
// //         }

// //         // Check password
// //         const isMatch = await user.matchPassword(password);
// //         if (!isMatch) {
// //             return res.status(400).json({ message: 'Invalid email or password' });
// //         }

// //         // Generate JWT token
// //         const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

// //         res.status(200).json({
// //             message: 'Login successful',
// //             user: { id: user._id, name: user.name, email: user.email, role: user.role },
// //             token
// //         });
// //     } catch (error) {
// //         console.error(error);
// //         res.status(500).json({ message: 'Server error' });
// //     }
// // };

// // controllers/authController.js

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


