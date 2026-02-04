const mongoose = require('mongoose');

const urlScanSchema = new mongoose.Schema({
    url: String,
    domain: String,
    malicious: Boolean,
    riskScore: Number,
    verdict: String,
    results: {
        virustotal: Object,
        heuristics: Array
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('URLScan', urlScanSchema);
