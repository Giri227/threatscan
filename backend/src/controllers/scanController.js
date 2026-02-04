const clamavScan = require('../engine/clamavScan');
const yaraScan = require('../engine/yaraScan');
const { extractFeatures, mlPredict } = require('../engine/mlModel');
const { lookupHash, lookupUrl } = require('../services/virustotal');
const abuseIPDB = require('../services/abuseIPDB');
const aggregateScore = require('../services/scoreAggregator');
const { validateFile } = require('../utils/fileHandler');
const { analyzeThreatWithAI } = require('../services/aiAnalysisService');
const FileScan = require('../models/FileScan');
const URLScan = require('../models/URLScan');
const logger = require('../utils/logger');

// Phase 2: Network Intelligence & Behavioral Analysis
const { urlhausService } = require('../services/urlhaus');
const { phishTankService } = require('../services/phishtank');
const { dgaDetector } = require('../services/dgaDetector');
const { behavioralAnalyzer } = require('../engine/behavioralAnalyzer');
const { contextAwareScoring } = require('../services/contextAwareScoring');
const fs = require('fs').promises;

exports.scanFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    let scanStartTime = Date.now();

    try {
        await validateFile(filePath);
        logger.info('File scan started', { fileName: req.file.originalname, size: req.file.size });

        // 1. Extract Features
        // 1. Extract Features & Detect File Type
        const features = await extractFeatures(filePath);
        const fileBuffer = await fs.readFile(filePath);

        // --- DECISION ENGINE START ---
        // Dynamically determining scan profile based on file content (magic bytes)
        // This prevents false positives like "Webshell detected in PDF"
        const { fileTypeFromBuffer } = await import('file-type');
        const typeHelper = await fileTypeFromBuffer(fileBuffer);

        let scanProfile = { ignoreCategories: [] };

        if (typeHelper && typeHelper.mime === 'application/pdf') {
            logger.info('Decision Engine: Applied PDF Profile (Ignoring Webshells)');
            scanProfile.ignoreCategories.push('webshell');
        }
        // --- DECISION ENGINE END ---

        const [clamavResults, yaraResults, mlResults, abuseResults, urlhausResults, behavioralResults] = await Promise.all([
            clamavScan(filePath).catch(err => { logger.error('ClamAV scan failed', { error: err.message }); return { status: 'error', error: err.message }; }),
            yaraScan(filePath, scanProfile).catch(err => { logger.error('YARA scan failed', { error: err.message }); return { status: 'error', error: err.message }; }),
            mlPredict(features).catch(err => { logger.error('ML prediction failed', { error: err.message }); return { status: 'error', error: err.message }; }),
            abuseIPDB.checkHash(features.hash).catch(err => { logger.error('AbuseIPDB check failed', { error: err.message }); return { found: false, error: err.message }; }),
            urlhausService.checkHash(features.hash).catch(err => { logger.error('URLhaus check failed', { error: err.message }); return { found: false, error: err.message }; }),
            behavioralAnalyzer.analyze(features, fileBuffer).catch(err => { logger.error('Behavioral analysis failed', { error: err.message }); return { status: 'error', error: err.message }; })
        ]);

        // 3. Optional VirusTotal
        const vtResults = await lookupHash(features.hash);

        // 4. AI Analysis
        const aiResults = await analyzeThreatWithAI(
            {
                filename: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                entropy: features.entropy,
                suspiciousStringCount: features.suspiciousStringCount,
                suspiciousPatterns: features.suspiciousPatterns
            },
            { clamav: clamavResults, yara: yaraResults, ml: mlResults, abuse: abuseResults }
        );

        // 5. Score Aggregation (with Phase 2 engines)
        const baseVerdict = aggregateScore({
            clamav: clamavResults,
            yara: yaraResults,
            ml: mlResults,
            virustotal: vtResults,
            abuse: abuseResults,
            urlhaus: urlhausResults,
            behavioral: behavioralResults,
            ai: aiResults
        });

        // 6. Context-Aware Scoring
        const context = {
            source: req.body.source || 'user_upload',
            fileType: features.extension,
            timestamp: Date.now(),
            hash: features.hash
        };

        const contextualScore = contextAwareScoring.calculateContextualScore(
            baseVerdict.risk_score,
            context,
            { behavioral: behavioralResults }
        );

        const finalVerdict = {
            ...baseVerdict,
            contextual_score: contextualScore.adjustedScore,
            context_adjustments: contextualScore.adjustments
        };

        const scanDuration = Date.now() - scanStartTime;

        // 6. DB Persistence
        try {
            await FileScan.create({
                filename: req.file.originalname,
                hash: features.hash,
                size: req.file.size,
                mimetype: req.file.mimetype,
                malicious: finalVerdict.verdict !== 'Safe',
                riskScore: finalVerdict.risk_score,
                verdict: finalVerdict.verdict,
                results: {
                    clamav: clamavResults,
                    yara: yaraResults,
                    ml: mlResults,
                    virustotal: vtResults,
                    abuse: abuseResults,
                    urlhaus: urlhausResults,
                    behavioral: behavioralResults,
                    ai: aiResults
                },
                contextualScore: contextualScore,
                scanDuration: scanDuration,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            });
        } catch (dbError) {
            logger.error('Failed to save FileScan to DB', { error: dbError.message });
        }

        res.json({
            fileName: req.file.originalname,
            hash: features.hash,
            size: req.file.size,
            scanDuration: scanDuration,
            ...finalVerdict,
            ai_analysis: aiResults
        });

    } catch (error) {
        logger.error('Scan process failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Analysis failed',
            details: error.message
        });
    }
};

exports.scanUrl = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let scanStartTime = Date.now();
    logger.info('URL scan started', { url });

    try {
        // 1. Parallel External Lookups (Phase 1 + Phase 2)
        const [abuseResults, vtResults, urlhausResults, phishTankResults] = await Promise.all([
            abuseIPDB.checkURL(url).catch(err => { logger.error('AbuseIPDB check failed', { error: err.message }); return { found: false, error: err.message }; }),
            lookupUrl(url).catch(err => { logger.error('VirusTotal check failed', { error: err.message }); return { status: 'error', error: err.message }; }),
            urlhausService.checkURL(url).catch(err => { logger.error('URLhaus check failed', { error: err.message }); return { found: false, error: err.message }; }),
            phishTankService.checkURL(url).catch(err => { logger.error('PhishTank check failed', { error: err.message }); return { found: false, error: err.message }; })
        ]);

        // 2. Enhanced Heuristics (Local Logic + DGA Detection)
        const heuristicResults = {
            score: 0,
            status: 'success',
            details: []
        };

        // Basic heuristics
        if (url.length > 100) { heuristicResults.score += 10; heuristicResults.details.push('Abnormally long URL'); }
        if (/@|%[0-9a-f]{2}/i.test(url)) { heuristicResults.score += 20; heuristicResults.details.push('Suspicious encoding/obfuscation'); }
        if (/\.xyz|\.top|\.tk/i.test(url)) { heuristicResults.score += 15; heuristicResults.details.push('High-risk TLD'); }

        // DGA Detection
        const dgaResults = dgaDetector.analyzeDomain(url);
        if (dgaResults.isDGA) {
            heuristicResults.score += dgaResults.score * 0.5; // Add 50% of DGA score
            heuristicResults.details.push(`DGA detected: ${dgaResults.reasons.join(', ')}`);
        }

        // 3. AI Analysis
        const aiResults = await analyzeThreatWithAI(
            {
                url: url,
                type: 'URL',
                heuristics: heuristicResults
            },
            { abuse: abuseResults, virustotal: vtResults }
        );

        // 4. Score Aggregation (with Phase 2 engines)
        const baseVerdict = aggregateScore({
            abuse: abuseResults,
            virustotal: vtResults,
            urlhaus: urlhausResults,
            phishtank: phishTankResults,
            ml: heuristicResults, // Map heuristics to ML slot
            ai: aiResults
        });

        // 5. Context-Aware Scoring
        const context = {
            source: req.body.source || 'user_upload',
            fileType: 'url',
            timestamp: Date.now()
        };

        const contextualScore = contextAwareScoring.calculateContextualScore(
            baseVerdict.risk_score,
            context,
            { dga: dgaResults }
        );

        const finalVerdict = {
            ...baseVerdict,
            contextual_score: contextualScore.adjustedScore,
            context_adjustments: contextualScore.adjustments,
            dga_analysis: dgaResults
        };

        const scanDuration = Date.now() - scanStartTime;

        // 5. DB Persistence
        try {
            await URLScan.create({
                url: url,
                malicious: finalVerdict.verdict !== 'Safe',
                riskScore: finalVerdict.risk_score,
                verdict: finalVerdict.verdict,
                results: {
                    abuse: abuseResults,
                    virustotal: vtResults,
                    urlhaus: urlhausResults,
                    phishtank: phishTankResults,
                    heuristics: heuristicResults,
                    dga: dgaResults,
                    ai: aiResults
                },
                contextualScore: contextualScore,
                scanDuration: scanDuration,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            });
        } catch (dbError) {
            logger.error('Failed to save URLScan to DB', { error: dbError.message });
        }

        res.json({
            url: url,
            scanDuration: scanDuration,
            ...finalVerdict,
            ai_analysis: aiResults
        });

    } catch (error) {
        logger.error('URL scan failed', { error: error.message });
        res.status(500).json({ error: 'URL Scan failed', details: error.message });
    }
};
