
async function checkLiveApi() {
    const url = 'https://threatscan-api.onrender.com/api/scan/url';
    const target = 'http://dga-test-123-abc-malware.com';

    console.log(`Checking live API at ${url} for ${target}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: target })
        });
        const data = await response.json();
        console.log('STATUS:', response.status);
        console.log('DATA:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

checkLiveApi();
