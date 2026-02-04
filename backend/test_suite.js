const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://threatscan-api.onrender.com/api';
// const BASE_URL = 'http://localhost:5000/api'; // Toggle if testing local

async function runTests() {
    console.log('🚀 Starting Comprehensive ThreatScan System Verification...\n');
    let passed = 0;
    let failed = 0;

    const details = [];
    const assert = (condition, msg) => {
        if (condition) {
            console.log(`✅ PASS: ${msg}`);
            passed++;
            details.push({ status: 'pass', msg });
        } else {
            console.error(`❌ FAIL: ${msg}`);
            failed++;
            details.push({ status: 'fail', msg });
        }
    };

    try {
        // TEST 1: System Health
        console.log('[1/5] Testing System Health...');
        const health = await axios.get(`${BASE_URL}/health`);
        assert(health.status === 200, 'Health endpoint returns 200 OK');
        assert(health.data.status === 'ok', 'Status is "ok"');
        console.log('   Response:', JSON.stringify(health.data));

        // TEST 2: Client Info (IP & Geo)
        console.log('\n[2/5] Testing Client Info...');
        const client = await axios.get(`${BASE_URL}/system/client-info`);
        assert(client.status === 200, 'Client info endpoint returns 200 OK');
        assert(client.data.ip, 'IP address detected');
        // assert(client.data.city || client.data.country, 'Geolocation data populated (City/Country)'); 
        // Note: Geo might fail if IP is local/proxy or API limit, but shouldn't crash.
        console.log('   IP detected:', client.data.ip);

        // TEST 3: Dashboard Intelligence (Real-Time Data)
        console.log('\n[3/5] Testing Dashboard Intelligence (The "Accuracy" Check)...');
        const dash = await axios.get(`${BASE_URL}/dashboard/intelligence`);
        assert(dash.status === 200, 'Dashboard endpoint returns 200 OK');

        // Validation of "Robust Stats" fix
        const cpu = dash.data.system?.cpu?.load;
        const ram = dash.data.system?.memory?.usedPercentage;
        assert(typeof cpu === 'number', `CPU Load is a number (${cpu}%)`);
        assert(typeof ram === 'number', `RAM Usage is a number (${ram}%)`);

        // Validation of "Heartbeat" fix
        const activity = dash.data.activity;
        assert(Array.isArray(activity), 'Activity feed is an array');
        assert(activity.length > 0, `Activity feed is NOT empty (${activity.length} items) - Heartbeat working!`);
        if (activity.length > 0) console.log('   Latest Event:', activity[0].type);

        // TEST 4: URL Scan
        console.log('\n[4/5] Testing URL Scan...');
        const urlScan = await axios.post(`${BASE_URL}/scan/url`, { url: 'https://example.com' });
        assert(urlScan.status === 200, 'URL Scan returns 200 OK');
        assert(urlScan.data.verdict, `Verdict returned: ${urlScan.data.verdict}`);
        assert(urlScan.data.risk_score !== undefined, 'Risk score calculated');

        // TEST 5: File Scan (Live Upload with AI Check)
        console.log('\n[5/5] Testing File Scan & AI Integration...');
        const form = new FormData();
        // Create a dummy file on the fly
        const testFile = path.join(__dirname, 'test_suite_dummy.exe');
        fs.writeFileSync(testFile, 'dummy content for test');
        form.append('file', fs.createReadStream(testFile));

        const fileScan = await axios.post(`${BASE_URL}/scan/file`, form, {
            headers: { ...form.getHeaders() }
        });

        assert(fileScan.status === 200, 'File Scan returns 200 OK');
        assert(fileScan.data.fileName === 'test_suite_dummy.exe', 'Filename preserved');
        assert(fileScan.data.ai_analysis, 'AI Analysis object is present (Integration Successful)');
        console.log('   AI Verdict:', fileScan.data.ai_analysis?.ai_verdict || 'Skipped (Key missing)');

        // Cleanup
        fs.unlinkSync(testFile);

    } catch (error) {
        console.error('\n⚠️ CRITICAL TEST FAILURE');
        let errorMsg = error.message;
        if (error.response) {
            errorMsg += ` - Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}`;
        }
        details.push({ status: 'fail', msg: `CRITICAL EXCEPTION: ${errorMsg}` });
        failed++;
    }

    const report = { passed, failed, details };
    console.log(JSON.stringify(report, null, 2));
    fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2));
}

runTests();
