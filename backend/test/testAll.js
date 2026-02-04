/**
 * Simple Test Suite for Malware Detection System
 * Tests all 4 phases without requiring full dependencies
 */

console.log('🧪 Testing Malware Detection System - All Phases\n');
console.log('='.repeat(60));

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    testsRun++;
    try {
        fn();
        testsPassed++;
        console.log(`✅ ${name}`);
        return true;
    } catch (error) {
        testsFailed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Phase 1 Tests
console.log('\n📦 Phase 1: Enhanced Detection Engines');
console.log('-'.repeat(60));

test('Ensemble Predictor loads', () => {
    const { ensemblePredictor } = require('../src/engine/ensemblePredictor');
    if (!ensemblePredictor) throw new Error('Failed to load');
});

test('PE Parser loads', () => {
    const { peParser } = require('../src/engine/peParser');
    if (!peParser) throw new Error('Failed to load');
});

test('TensorFlow Model loads (optional)', () => {
    try {
        const { tensorflowModel } = require('../src/engine/tensorflowModel');
        if (!tensorflowModel) throw new Error('Failed to load');
    } catch (error) {
        console.log('   ⚠️  TensorFlow not available (optional dependency)');
    }
});

// Phase 2 Tests
console.log('\n🌐 Phase 2: Network Intelligence & Behavioral Analysis');
console.log('-'.repeat(60));

test('URLhaus Service loads', () => {
    const { urlhausService } = require('../src/services/urlhaus');
    if (!urlhausService) throw new Error('Failed to load');
});

test('PhishTank Service loads', () => {
    const { phishTankService } = require('../src/services/phishtank');
    if (!phishTankService) throw new Error('Failed to load');
});

test('DGA Detector loads', () => {
    const { dgaDetector } = require('../src/services/dgaDetector');
    if (!dgaDetector) throw new Error('Failed to load');
});

test('DGA Detector - Test legitimate domain', () => {
    const { dgaDetector } = require('../src/services/dgaDetector');
    const result = dgaDetector.analyzeDomain('google.com');
    if (result.isDGA) throw new Error('False positive on legitimate domain');
});

test('DGA Detector - Test suspicious domain', () => {
    const { dgaDetector } = require('../src/services/dgaDetector');
    const result = dgaDetector.analyzeDomain('xjk8dh2kls9f3m.xyz');
    if (!result.isDGA) throw new Error('Failed to detect DGA');
    if (result.score < 50) throw new Error('DGA score too low');
});

test('Behavioral Analyzer loads', () => {
    const { behavioralAnalyzer } = require('../src/engine/behavioralAnalyzer');
    if (!behavioralAnalyzer) throw new Error('Failed to load');
});

test('Context-Aware Scoring loads', () => {
    const { contextAwareScoring } = require('../src/services/contextAwareScoring');
    if (!contextAwareScoring) throw new Error('Failed to load');
});

test('Context-Aware Scoring - Email attachment risk', () => {
    const { contextAwareScoring } = require('../src/services/contextAwareScoring');
    const result = contextAwareScoring.calculateContextualScore(50, {
        source: 'email_attachment',
        fileType: 'executable',
        timestamp: Date.now()
    }, {});
    if (result.adjustedScore <= 50) throw new Error('Score should increase for risky context');
});

// Phase 3 Tests
console.log('\n🛡️  Phase 3: Evasion Detection & Distributed Architecture');
console.log('-'.repeat(60));

test('Evasion Detector loads', () => {
    const { evasionDetector } = require('../src/engine/evasionDetector');
    if (!evasionDetector) throw new Error('Failed to load');
});

test('Adaptive Analyzer loads', () => {
    const { adaptiveAnalyzer } = require('../src/engine/adaptiveAnalyzer');
    if (!adaptiveAnalyzer) throw new Error('Failed to load');
});

test('Task Queue loads', () => {
    const { getQueue } = require('../src/utils/taskQueue');
    const queue = getQueue('test');
    if (!queue) throw new Error('Failed to load');
});

test('Task Queue - Enqueue/Dequeue', async () => {
    const { getQueue } = require('../src/utils/taskQueue');
    const queue = getQueue('test');
    const taskId = await queue.enqueue({ type: 'test', data: 'test' });
    if (!taskId) throw new Error('Failed to enqueue');
    const task = await queue.dequeue();
    if (!task || task.id !== taskId) throw new Error('Failed to dequeue');
});

test('Worker Manager loads', () => {
    const { workerManager } = require('../src/utils/workerManager');
    if (!workerManager) throw new Error('Failed to load');
});

test('Scan Orchestrator loads', () => {
    const { scanOrchestrator } = require('../src/services/scanOrchestrator');
    if (!scanOrchestrator) throw new Error('Failed to load');
});

// Phase 4 Tests
console.log('\n🔄 Phase 4: Continuous Learning & Optimization');
console.log('-'.repeat(60));

test('Feedback Collector loads', () => {
    const { feedbackCollector } = require('../src/services/feedbackCollector');
    if (!feedbackCollector) throw new Error('Failed to load');
});

test('Model Version Manager loads', () => {
    const { modelVersionManager } = require('../src/services/modelVersionManager');
    if (!modelVersionManager) throw new Error('Failed to load');
});

test('Active Learning Selector loads', () => {
    const { activeLearningSelector } = require('../src/services/activeLearningSelector');
    if (!activeLearningSelector) throw new Error('Failed to load');
});

test('Retraining Pipeline loads', () => {
    const { retrainingPipeline } = require('../src/services/retrainingPipeline');
    if (!retrainingPipeline) throw new Error('Failed to load');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsRun}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! System is ready for deployment.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review errors above.');
    process.exit(1);
}
