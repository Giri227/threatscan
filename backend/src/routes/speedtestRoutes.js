const express = require('express');
const router = express.Router();
const speedtestController = require('../controllers/speedtestController');

router.get('/ping', speedtestController.ping);
router.get('/download', speedtestController.download);
router.post('/upload', speedtestController.upload);

module.exports = router;
