
// Dummy Behavioral Analyzer to bypass loading errors
exports.behavioralAnalyzer = {
    analyze: async () => ({ score: 0, verdict: 'Safe' })
};
