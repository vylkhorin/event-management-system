const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to req
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check token version to support global logout
        const tokenVersion = decoded.tokenVersion || 0;
        if (user.tokenVersion !== tokenVersion) {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

// Restrict to admin role only
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };
