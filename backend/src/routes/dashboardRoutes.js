const express = require('express');
const { getDashboardIntelligence } = require('../controllers/dashboardController.js');

const router = express.Router();

// GET /api/dashboard/intelligence
router.get('/intelligence', getDashboardIntelligence);

module.exports = router;
