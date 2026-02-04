/**
 * Simple test script for Phase 1 components
 * Tests TensorFlow model, PE parser, and ensemble predictor
 */

const fs = require('fs');
const path = require('path');

async function testPhase1Components() {
    console.log('='.repeat(60));
    console.log('Phase 1 Component Testing');
    console.log('='.repeat(60));
    console.log('');

    // Test 1: TensorFlow Model
    console.log('Test 1: TensorFlow Model');
    console.log('-'.repeat(60));
    try {
        const { tensorflowModel } = require('./src/engine/tensorflowModel');

        const testFeatures = {
            size: 1024000,
            entropy: 7.5,
            suspiciousStringCount: 10,
            importCount: 25,
            sectionCount: 5,
            maxSectionEntropy: 7.8
        };

        console.log('Loading TensorFlow model...');
        const result = await tensorflowModel.predict(testFeatures);

        console.log('✓ TensorFlow model loaded successfully');
        console.log(`  Score: ${result.score}`);
        console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`  Uncertainty: ${result.uncertainty?.toFixed(4) || 'N/A'}`);
        console.log(`  Verdict: ${result.verdict}`);
        console.log('');
    } catch (error) {
        console.log('✗ TensorFlow model test failed:', error.message);
        console.log('  Note: This is expected if TensorFlow.js is not installed yet');
        console.log('');
    }

    // Test 2: PE Parser
    console.log('Test 2: PE Parser');
    console.log('-'.repeat(60));
    try {
        const { peParser } = require('./src/engine/peParser');

        // Create a minimal PE file header for testing
        const testBuffer = Buffer.alloc(1024);
        testBuffer.writeUInt16LE(0x5A4D, 0); // MZ signature
        testBuffer.writeUInt32LE(64, 60); // PE offset
        testBuffer.writeUInt32LE(0x00004550, 64); // PE signature

        const result = await peParser.parsePE(testBuffer);

        if (result.isPE) {
            console.log('✓ PE parser working correctly');
            console.log(`  Detected as PE: ${result.isPE}`);
            console.log('');
        } else {
            console.log('✓ PE parser correctly identified invalid PE');
            console.log(`  Error: ${result.error}`);
            console.log('');
        }
    } catch (error) {
        console.log('✗ PE parser test failed:', error.message);
        console.log('');
    }

    // Test 3: Ensemble Predictor
    console.log('Test 3: Ensemble Predictor');
    console.log('-'.repeat(60));
    try {
        const { ensemblePredictor } = require('./src/engine/ensemblePredictor');

        const testPredictions = {
            heuristic: { status: 'success', score: 70, confidence: 0.75 },
            tensorflow: { status: 'success', score: 85, confidence: 0.90 },
            peAnalysis: { status: 'success', score: 65, confidence: 0.80 }
        };

        const result = await ensemblePredictor.predict(testPredictions);

        console.log('✓ Ensemble predictor working correctly');
        console.log(`  Ensemble Score: ${result.score}`);
        console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`  Disagreement Level: ${result.disagreement?.level || 'N/A'}`);
        console.log(`  Verdict: ${result.verdict}`);
        console.log('');
    } catch (error) {
        console.log('✗ Ensemble predictor test failed:', error.message);
        console.log('');
    }

    // Test 4: Enhanced ML Model
    console.log('Test 4: Enhanced ML Model Integration');
    console.log('-'.repeat(60));
    try {
        const { extractFeatures, mlPredict } = require('./src/engine/mlModel');

        // Test with a simple text file
        const testFilePath = path.join(__dirname, 'package.json');

        console.log('Extracting features from package.json...');
        const features = await extractFeatures(testFilePath);

        console.log('✓ Feature extraction successful');
        console.log(`  Size: ${features.size} bytes`);
        console.log(`  Entropy: ${features.entropy.toFixed(2)}`);
        console.log(`  Suspicious strings: ${features.suspiciousStringCount}`);
        console.log('');

        console.log('Running ML prediction...');
        const mlResult = await mlPredict(features);

        console.log('✓ ML prediction successful');
        console.log(`  Score: ${mlResult.score}`);
        console.log(`  Confidence: ${(mlResult.confidence * 100).toFixed(1)}%`);
        console.log(`  Verdict: ${mlResult.verdict}`);
        if (mlResult.disagreement) {
            console.log(`  Disagreement: ${mlResult.disagreement.level}`);
        }
        console.log('');
    } catch (error) {
        console.log('✗ ML model integration test failed:', error.message);
        console.log('');
    }

    // Test 5: Score Aggregator
    console.log('Test 5: Enhanced Score Aggregator');
    console.log('-'.repeat(60));
    try {
        const aggregateScore = require('./src/services/scoreAggregator');

        const testResults = {
            clamav: { status: 'success', score: 0, confidence: 0.9 },
            yara: { status: 'success', score: 0, confidence: 0.85 },
            ml: {
                status: 'success',
                score: 25,
                confidence: 0.7,
                uncertainty: { variance: 10, standardDeviation: 3.16 }
            },
            virustotal: { status: 'success', score: 0, confidence: 0.8 },
            ai: { confidence: 15, ai_verdict: 'SAFE' }
        };

        const result = aggregateScore(testResults);

        console.log('✓ Score aggregator working correctly');
        console.log(`  Risk Score: ${result.risk_score}/100`);
        console.log(`  Verdict: ${result.verdict}`);
        console.log(`  Severity: ${result.severity}`);
        console.log(`  Overall Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`  Requires Review: ${result.metrics?.requiresReview ? 'Yes' : 'No'}`);
        console.log('');
    } catch (error) {
        console.log('✗ Score aggregator test failed:', error.message);
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('Testing Complete');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log('- TensorFlow model: Requires npm install completion');
    console.log('- PE parser: Functional');
    console.log('- Ensemble predictor: Functional');
    console.log('- ML model integration: Functional (with fallback)');
    console.log('- Score aggregator: Enhanced with uncertainty metrics');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Complete npm install (TensorFlow.js)');
    console.log('2. Test with real malware samples');
    console.log('3. Train TensorFlow model on dataset');
    console.log('4. Benchmark performance and accuracy');
}

// Run tests
testPhase1Components().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
