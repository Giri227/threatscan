try {
    console.log('Loading app.js...');
    require('./src/app');
    console.log('Success!');
} catch (e) {
    console.error('CRASH:', e);
}
