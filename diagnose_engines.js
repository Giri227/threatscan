const clamavScan = require('./backend/src/engine/clamavScan');
const yaraScan = require('./backend/src/engine/yaraScan');
const { extractFeatures, mlPredict } = require('./backend/src/engine/mlModel');
const { analyzeThreatWithAI } = require('./backend/src/services/aiAnalysisService');
const path = require('path');
const fs = require('fs');

async function runDiagnostics() {
    console.log("=== THREATSCAN SENIOR DIAGNOSTIC SUITE ===");
    console.log("Time:", new Date().toISOString());
    console.log("CWD:", process.cwd());

    const testFile = path.resolve('./README.md');
    console.log("\n1. Testing ClamAV Runtime...");
    try {
        const clamResult = await clamavScan(testFile);
        console.log("ClamAV Output:", JSON.stringify(clamResult, null, 2));
    } catch (e) {
        console.error("ClamAV CRITICAL FAILURE:", e);
    }

    console.log("\n2. Testing ML Feature Extraction...");
    let features;
    try {
        features = await extractFeatures(testFile);
        console.log("Features Extracted:", Object.keys(features));
        const mlResult = await mlPredict(features);
        console.log("ML Prediction:", JSON.stringify(mlResult, null, 2));
    } catch (e) {
        console.error("ML CRITICAL FAILURE:", e);
    }

    console.log("\n3. Testing AI Simulation Pipeline...");
    try {
        const aiResult = await analyzeThreatWithAI(
            { filename: 'test.exe', entropy: 7.5, suspiciousStringCount: 5 },
            { ml: { score: 80 } }
        );
        console.log("AI Result:", JSON.stringify(aiResult, null, 2));
    } catch (e) {
        console.error("AI CRITICAL FAILURE:", e);
    }

    console.log("\n=== DIAGNOSTICS COMPLETE ===");
}

runDiagnostics();
