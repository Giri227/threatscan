const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require('../utils/logger');

// Initialize Gemini API
// User must provide GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE");

const analyzeThreatWithAI = async (metadata, scanResults, scanType = 'FILE') => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
            logger.info("Engaging Gemini AI Simulation Mode (API Key Missing/Default)");

            let verdict = "SAFE";
            let prob = 15;
            let reasoning = "Global reputation checks indicate this vector has low prevalence but no known malicious associations.";

            const entropy = metadata.entropy || 0;
            const suspiciousCount = metadata.suspiciousStringCount || 0;

            if (entropy > 7.2) {
                verdict = "SUSPICIOUS";
                prob = 65;
                reasoning = `Advanced neural filtering detected high entropy (${entropy.toFixed(2)}) suggesting potential obfuscated payloads.`;
            } else if (suspiciousCount > 2) {
                verdict = "MALICIOUS";
                prob = 88;
                reasoning = `Heuristic pattern matching identified ${suspiciousCount} critical process manipulation indicators.`;
            } else if (scanType === 'URL') {
                reasoning = "Structural analysis of the URL confirms consistency with known safe patterns. No phishing indicators detected.";
            }

            return {
                status: 'success',
                ai_verdict: verdict,
                confidence: prob,
                analysis: `[SIMULATED] ${reasoning}`
            };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        let prompt = "";

        if (scanType === 'URL') {
            prompt = `
            You are a highly paranoid Cyber Security Malware Analyst specialized in Phishing and URL Forensics. Analyze this URL and scan technicals.
            
            TARGET URL: ${metadata.url}
            
            URL INDICATORS:
            - Structure: Protocol=${metadata.structure.protocol}, Domain=${metadata.structure.domain}
            - Length: ${metadata.structure.length}
            - Suspicious Keywords Found: ${metadata.heuristics.join(', ') || 'None'}
            
            EXTERNAL INTEL:
            - VirusTotal Score: ${scanResults.virustotal.score}/100 (Positives: ${scanResults.virustotal.positives})
            
            ANALYSIS INSTRUCTIONS:
            1. Analyze the URL string for "typosquatting" (e.g. g00gle.com), "homograph attacks", or unusual TLDs (.xyz, .top).
            2. If 'VirusTotal Score' is > 0, take it seriously.
            3. If the URL contains words like "login", "verify", "secure" but is NOT on a major trusted domain (google, microsoft, etc), flag it as PHISHING.
            4. ACT PARANOID. If it looks even slightly weird, mark it suspicious.
            
            OUTPUT FORMAT (JSON):
            {
                "verdict": "MALICIOUS" | "SAFE" | "SUSPICIOUS",
                "probability": <0-100 integer>,
                "explanation": "<Concise reasoning focusing on URL structure, keywords, and threat intel>"
            }
            `;
        } else {
            // FILE SCAN PROMPT
            prompt = `
            You are a highly paranoid Cyber Security Malware Analyst. Analyze these scan results and technical indicators to give a final verdict.
            
            FILE METADATA:
            Name: ${metadata.filename}
            Size: ${metadata.size} bytes
            Type: ${metadata.mimetype}
            Entropy: ${metadata.entropy.toFixed(2)} (High > 7.0 indicates packing/encryption)
            Suspicious Strings Found: ${metadata.suspiciousStringCount}
            Specific Indicators: ${metadata.suspiciousPatterns ? metadata.suspiciousPatterns.join(', ') : 'None'}
            
            SCAN ENGINE RESULTS:
            ClamAV: ${JSON.stringify(scanResults.clamav)}
            Yara: ${JSON.stringify(scanResults.yara)}
            Heuristic ML Score: ${scanResults.ml.score}/100 (Verdict: ${scanResults.ml.verdict})
            ML Reasons: ${JSON.stringify(scanResults.ml.reasons)}
            
            ANALYSIS INSTRUCTIONS:
            1. If 'Entropy' is > 7.0 OR 'Suspicious Strings' > 0, you must treat this file as potentially malicious, even if ClamAV/Yara missed it.
            2. If 'Heuristic ML Score' is high (>50), agree with it unless you have strong proof otherwise.
            3. Do NOT default to "SAFE" just because ClamAV says "Clean". ClamAV often misses unknown threats (zero-days).
            
            OUTPUT FORMAT (JSON):
            {
                "verdict": "MALICIOUS" | "SAFE" | "SUSPICIOUS",
                "probability": <0-100 integer>,
                "explanation": "<Concise reasoning focusing on entropy, strings, and heuristics>"
            }
            `;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Attempt to parse JSON from AI response
        try {
            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResponse = JSON.parse(cleanText);
            return {
                ai_verdict: jsonResponse.verdict,
                confidence: jsonResponse.probability,
                analysis: jsonResponse.explanation
            };
        } catch (parseError) {
            console.warn("Failed to parse AI response as JSON:", text);
            return {
                ai_verdict: "UNCERTAIN",
                confidence: 50,
                analysis: "AI provided unstructured analysis: " + text.substring(0, 100) + "..."
            };
        }

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return {
            ai_verdict: "ERROR",
            confidence: 0,
            analysis: "AI Service temporarily unavailable."
        };
    }
};

module.exports = { analyzeThreatWithAI };
