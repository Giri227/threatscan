# THREATSCAN: Next-Gen AI Malware Analysis Suite
## Technical Case Study & Architecture Overview

**Date:** January 2026
**System Architects:** @Giridhar Pai, @WHITEHATWOLF, @Jesteena Mary Oommen, @Luna Pheonix

---

### 1. Executive Summary
**ThreatScan** is an advanced, real-time malware analysis platform engineered to bridge the gap between traditional signature-based detection and modern behavior-based AI heuristics. Built on a MERN stack architecture with integrated **Google Gemini 1.5 Pro AI**, it provides immediate, granular threat assessments for files and URLs.

Unlike standard antivirus solutions, ThreatScan leverages a "Paranoid Mode" AI analyst that evaluates file entropy, API call patterns, and obfuscated string data to explain *why* a file is dangerous, not just *if* it is.

---

### 2. Core Architecture

The system operates on a decentralized scanning mesh:

*   **Frontend Core**: React.js + Vite + TailwindCSS (Glassmorphism UI)
*   **Backend Nexus**: Node.js + Express (Rate-limited, Helmet-secured)
*   **Intelligence Engine**: Google Gemini Pro (Semantic Analysis)
*   **Persistence Layer**: MongoDB Atlas (Real-time telemetry storage)
*   **Heuristic Engine**: Custom ML logic (Entropy calculations, Pattern matching)

#### Data Flow
1.  **Ingestion**: Client provides File (Blob) or URL.
2.  **Feature Extraction**: System calculates SHA-256 hash, File Entropy, and extracts strings.
3.  **Parallel Analysis**:
    *   *Layer 1*: Signature Check (ClamAV/Yara simulation)
    *   *Layer 2*: ML Heuristics (Suspicious pattern scoring)
    *   *Layer 3*: **Gemini AI Analyst** (Reasoning & Verdict)
4.  **Aggregation**: Results are fused into a unified Risk Score (0-100).
5.  **Visualization**: Real-time React Dashboard renders the topology.

---

### 3. Key Features


#### 🛡️ AI Threat Reasoning
The system doesn't just return "Malicious". It explains its verdict using a specialized prompted Persona (The "Paranoid Analyst").
*   **File Analysis**: Evaluates entropy (7.8+), packed code, and suspicious API calls.
*   **URL Intelligence**: Detects phishing, typosquatting (e.g., `g00gle.com`), and unusual TLDs (.xyz) even if they aren't on blacklists yet.

#### 🌍 Real-Time Global Telemetry
*   **Live Threat Map**: Visualizes scan origins using topological hashing.
*   **System Forensics**: Automatically resolves ISP, ASN, and Geo-location of the client for audit trails.
*   **Zero-Mock Policy**: All displayed charts, logs, and alerts represent 100% real-time user activity. No dummy data.

#### ⚡ "Glitch" Aesthetic UI
Designed for the modern SOC (Security Operations Center), featuring:
*   Dark Mode Glassmorphism
*   Interactive Data Visualization (Chart.js)
*   Reactive "Glitch" effects for high-priority alerts

---

### 4. Technical Specifications

| Component | Technology |
| :--- | :--- |
| **Framework** | MERN (MongoDB, Express, React, Node) |
| **AI Model** | Google Gemini 1.5 Pro (Paranoid Mode) |
| **Styling** | TailwindCSS + Framer Motion |
| **Infrastructure** | Automated CI/CD (GitHub Actions) |
| **Deployment** | Render (Backend) + GitHub Pages (Frontend) |
| **Security** | CORS Whitelisting, Rate Limiting, Input Sanitization |

---

### 5. Future Roadmap
*   **Phase 2**: Automated Sandbox Detonation (Cuckoo integration).
*   **Phase 3**: Enterprise API Keys & SSO.
*   **Phase 4**: Recursive Archive Scanning (.zip/.tar).

---

*© 2026 PROTECT. All Rights Reserved.*
