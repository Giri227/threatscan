# ThreatScan Scoring Logic & Formula

This document outlines the concrete mathematical model used to calculate the 0-100 Risk Score.

## 1. Weighted Components

The final `Risk Score` is a weighted average of 5 distinct analysis engines.

| Engine | Type | Weight | Description |
| :--- | :--- | :--- | :--- |
| **ML Heuristics** | Deterministic | **35%** | Entropy, LOLBins, API Calls, File Anomalies. |
| **Gemini AI** | Cognitive | **25%** | "Paranoid Analyst" verdict based on features. |
| **ClamAV** | Signature | **20%** | Standard antivirus definitions. |
| **YARA** | Signature | **15%** | Pattern matching rules. |
| **VirusTotal** | Reputation | **5%** | External consensus check. |

## 2. Heuristic Scoring (The 35%)

The `mlModel.js` engine outputs a score (0-100) based on these rules:
*   **Base Score**: 0
*   **Entropy**:
    *   `> 8.0`: **+90** (Critical Encryption/Ransomware)
    *   `7.5 - 7.9`: **+50** (Packed/Compressed)
    *   `7.0 - 7.4`: **+20** (Suspicious)
*   **Suspicious Strings (LOLBins/APIs)**:
    *   `+10` per match (Max 80)
    *   `+20` bonus if > 5 distinct vectors found.
*   **File Anomalies**:
    *   Tiny PE (< 5KB): **+20** (Stager)
    *   Large File (> 10MB): **+10**

## 3. Override Logic (Calculated AFTER Average)

To prevents false negatives, specific "Kill Switch" conditions override the average:

1.  **AI Confidence Override**:
    *   IF `AI_Confidence > 90` AND `Verdict == MALICIOUS` -> **Min Score: 85**
    *   *Why?* If the LLM sees a clear phishing pattern that heuristics missed, we trust it.

2.  **Critical Heuristic Override**:
    *   IF `Heuristic_Score >= 90` -> **Min Score: 80**
    *   *Why?* If entropy is 8.0 (mathematically impossible for plaintext), it IS encrypted/packed code, regardless of what ClamAV says.

## 4. AI Prompt Structure

Using the "Paranoid Analyst" persona, we feed:
```json
{
  "entropy": 7.82,
  "suspiciousPatterns": ["powershell", "VirtualAlloc", "mimikatz"],
  "engineResults": { "clamav": "clean", "ml": "suspicious" }
}
```
Gemini returns:
```json
{
  "verdict": "MALICIOUS",
  "probability": 95,
  "explanation": "High entropy combined with VirtualAlloc and PowerShell indicates a packed loader injecting code."
}
```
