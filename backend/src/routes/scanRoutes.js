const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const scanController = require('../controllers/scanController');
const { validateFileUpload, validateUrlScan } = require('../middleware/validation');
const logger = require('../utils/logger');

// Middleware to tag requests with ID
router.use((req, res, next) => {
    req.scanId = uuidv4();
    // Log incoming scan attempt (without sensitivity)
    if (req.path === '/file' || req.path === '/url') {
        logger.info('Incoming scan request', {
            scanId: req.scanId,
            path: req.path,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
    }
    next();
});

// Rate limiting
// Rate limiting (Stricter for Production)
const scanLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 scan requests per windowMs
    message: 'Too many scan requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip });
        res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
    }
});

// Multer configuration with security
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4().substring(0, 8);
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${uniqueId}-${sanitized}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800)
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || 'exe,dll,pdf,doc,docx,xls,xlsx,ppt,pptx,zip,rar,7z,jpg,png,txt,bat,ps1,vbs').split(',');
        const fileExt = file.originalname.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExt)) {
            logger.warn('File upload rejected - invalid extension', { ext: fileExt, scanId: req.scanId });
            const err = new Error('Invalid file type');
            err.statusCode = 400;
            err.clientMessage = `Files with .${fileExt} are not allowed. Allowed: ${allowedExtensions.join(', ')}`;
            return cb(err);
        }
        cb(null, true);
    }
});

// Routes
router.post('/file', scanLimiter, upload.single('file'), validateFileUpload, scanController.scanFile);
router.post('/url', scanLimiter, validateUrlScan, scanController.scanUrl);

module.exports = router;
