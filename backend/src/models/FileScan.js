const mongoose = require('mongoose');

const fileScanSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    hash: { type: String, required: true, index: true },
    size: { type: Number, required: true },
    mimetype: String,
    malicious: { type: Boolean, default: false, index: true },
    riskScore: { type: Number, default: 0 },
    verdict: String,
    results: {
        clamav: Object,
        yara: Object,
        ml: Object,
        virustotal: Object,
        abuse: Object, // Added AbuseIPDB result storage
        ai: Object
    },
    scanDuration: Number,
    ip: String, // Added Forensic Field
    userAgent: String, // Added Forensic Field
    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for dashboard queries
fileScanSchema.index({ createdAt: -1 });
fileScanSchema.index({ malicious: 1, createdAt: -1 });

module.exports = mongoose.model('FileScan', fileScanSchema);
