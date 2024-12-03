const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const validRole = role === 'admin' ? 'admin' : 'user';

        // Create user with requested role
        const user = await User.create({ name, email: email.toLowerCase(), password, role: validRole });

        // Generate JWT token (includes role and tokenVersion)
        const token = jwt.sign(
            { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login user/admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        // We'll call the frontend payload 'email' or 'identifier', let's accept either.
        const identifier = req.body.email || req.body.identifier;
        const { password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Email/Name and password are required' });
        }

        // Find user by email or name
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { name: new RegExp(`^${identifier.trim()}$`, 'i') }
            ]
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Compare entered password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Generate token — MUST include role for frontend role-based routing and tokenVersion
        const token = jwt.sign(
            { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Logout user from all sessions (invalidates token version)
// @route   POST /api/auth/logout-all
// @access  Private
exports.logoutAll = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.tokenVersion += 1;
        await user.save();
        
        res.json({ message: 'Successfully logged out from all sessions' });
    } catch (error) {
        console.error('LogoutAll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
