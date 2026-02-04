const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

const validateFileUpload = [
    body('file').custom((value, { req }) => {
        if (!req.file) {
            throw new Error('No file uploaded');
        }
        
        const maxSize = parseInt(process.env.MAX_FILE_SIZE || 52428800);
        if (req.file.size > maxSize) {
            throw new Error(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
        }
        
        const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || 'exe,dll,pdf').split(',');
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            throw new Error(`File type .${fileExt} is not allowed`);
        }
        
        return true;
    }),
    handleValidationErrors
];

const validateUrlScan = [
    body('url')
        .trim()
        .isURL({ require_protocol: true })
        .withMessage('Invalid URL format')
        .isLength({ max: 2048 })
        .withMessage('URL is too long'),
    handleValidationErrors
];

module.exports = {
    validateFileUpload,
    validateUrlScan,
    handleValidationErrors
};
