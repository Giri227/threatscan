require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const axios = require('axios');
const logger = require('./utils/logger');

const app = express();
const connectDB = require('./utils/db');

// Connect to Database
connectDB();

// Security middleware
// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false // Required for some chart libraries/CDN assets
}));

const ALLOWED_ORIGINS = [
    'https://giri227.github.io',
    'http://localhost:5173',
    'http://localhost:5174'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Logging middleware
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists (sync version to avoid async issues)
const fs = require('fs');
try {
    if (!fs.existsSync(process.env.UPLOAD_DIR || './uploads')) {
        fs.mkdirSync(process.env.UPLOAD_DIR || './uploads', { recursive: true });
    }
} catch (err) {
    console.error('Failed to create upload directory:', err.message);
}

// Routes
const scanRoutes = require('./routes/scanRoutes');
const speedtestRoutes = require('./routes/speedtestRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // Added dashboardRoutes import
app.use('/api/scan', scanRoutes);
app.use('/api/speedtest', speedtestRoutes);
app.use('/api/dashboard', dashboardRoutes); // Added dashboardRoutes usage

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Client info endpoint
const { getClientInfo } = require('./services/ipInfo');

app.get('/api/system/client-info', async (req, res) => {
    try {
        let ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress;

        if (ip === '::1' || ip === '127.0.0.1') {
            try {
                const resp = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
                ip = resp.data.ip;
            } catch (error) {
                logger.warn('Failed to get public IP', { error: error.message });
            }
        }

        const info = await getClientInfo(ip);
        res.json({
            ...info,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Client info endpoint error', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve client information' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        scanId: req.scanId
    });

    // Custom Client Messages (from Multer filter etc)
    if (err.clientMessage) {
        return res.status(err.statusCode || 400).json({ error: err.clientMessage });
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds maximum limit (50MB)' });
    }
    if (err.code === 'LIMIT_PART_COUNT') {
        return res.status(400).json({ error: 'Too many parts' });
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
