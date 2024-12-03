const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config({ path: require('path').join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded event images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Silence Chrome DevTools auto-discovery probe (not a real route)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());

// Serve the frontend static files so opening http://localhost:5000 works
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Fallback: any non-API, non-file request → serve index.html
// Note: Express 5 dropped bare '*' wildcard — use app.use() instead
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
