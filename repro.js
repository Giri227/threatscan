
const { urlhausService } = require('./backend/src/services/urlhaus');
const { phishTankService } = require('./backend/src/services/phishtank');
const { dgaDetector } = require('./backend/src/services/dgaDetector');
const { contextAwareScoring } = require('./backend/src/services/contextAwareScoring');
const aggregateScore = require('./backend/src/services/scoreAggregator');
const virustotal = require('./backend/src/services/virustotal');
const abuseIPDB = require('./backend/src/services/abuseIPDB');

const logger = require('./backend/src/utils/logger');

async function testScanUrl() {
    const url = 'https://google.com';
    console.log('Testing URL scan logic for:', url);

    try {
        console.log('1. Testing parallel lookups...');
        const [abuseResults, vtResults, urlhausResults, phishTankResults] = await Promise.all([
            abuseIPDB.checkURL(url).catch(err => { console.log('Abuse Catch'); logger.error('AbuseIPDB check failed', { error: err.message }); return { found: false, error: err.message }; }),
            virustotal.lookupUrl(url).catch(err => { console.log('VT Catch'); logger.error('VirusTotal check failed', { error: err.message }); return { status: 'error', error: err.message }; }),
            urlhausService.checkURL(url).catch(err => { console.log('URLhaus Catch'); logger.error('URLhaus check failed', { error: err.message }); return { found: false, error: err.message }; }),
            phishTankService.checkURL(url).catch(err => { console.log('PhishTank Catch'); logger.error('PhishTank check failed', { error: err.message }); return { found: false, error: err.message }; })
        ]);

        console.log('2. Testing heuristics...');
        const heuristicResults = { score: 0, status: 'success', details: [] };
        const dgaResults = dgaDetector.analyzeDomain(url);

        console.log('3. Testing score aggregation...');
        const baseVerdict = aggregateScore({
            abuse: abuseResults,
            virustotal: vtResults,
            urlhaus: urlhausResults,
            phishtank: phishTankResults,
            ml: heuristicResults,
            ai: { ai_verdict: 'MOCK', confidence: 50, analysis: 'Mock' }
        });

        console.log('4. Testing context-aware scoring...');
        const contextualScore = contextAwareScoring.calculateContextualScore(
            baseVerdict.risk_score,
            { source: 'test', fileType: 'url', timestamp: Date.now() },
            { dga: dgaResults }
        );

        console.log('Success! No reference errors found.');
    } catch (error) {
        console.error('CRASH DETECTED:');
        console.error(error);
    }
}

testScanUrl();
