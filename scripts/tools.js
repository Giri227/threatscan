export const TOOL_MAP = {
    "Perimeter": {
        tools: ["Port Scanner", "Packet Sniffer", "Firewall Rules", "IDS", "Bug Bounty Recon"],
        style: "glow-border-cyan"
    },
    "Web-Shield": {
        tools: ["XSS Scanner", "SQLi Detector", "Basic WAF", "JWT Analyzer", "XSS Exploiter"],
        style: "glow-border-cyan" // Using cyan for consistency or specific class if needed
    },
    "Vault": {
        tools: ["Bcrypt Login", "2FA (OTP)", "RBAC API", "Zero-Trust System"],
        style: "glow-border-pink"
    },
    "Cognitive": {
        tools: ["Phishing URL Detector", "AI Phishing Detector", "IP Lookup", "Malware Signatures"],
        style: ""
    },
    "Cipher Lab": {
        tools: ["ENCRYPAI", "Caesar Cipher", "File Integrity", "Password Strength"],
        style: "glow-border-cyan"
    },
    "Red-Zone": {
        tools: ["Brute Force Sim", "Password Cracker", "Keylogger (Edu)", "Ransomware Sim", "Attack Lab"],
        style: "border-red-500 border-l-4" // Tailwind utility for specific override
    },
    "Blue-Zone": {
        tools: ["Login Protection", "SIEM Visualizer", "Vulnerability Scanner"],
        style: "glow-border-cyan"
    },
    "Command": {
        tools: ["Admin Panel (DECRYPAI)", "Full-Stack Lab", "Live Geolocation Map"],
        style: "col-span-full border-t border-cyan-500" // Special header style
    },
    "System Intelligence": {
        tools: ["Network Metadata", "Device Forensics", "Identity Resolution"],
        style: "glow-border-cyan"
    }
};

export const ToolManager = {
    init(gridContainerId) {
        const container = document.getElementById(gridContainerId);
        if (!container) return;

        container.innerHTML = ''; // Clear

        Object.entries(TOOL_MAP).forEach(([segment, data], index) => {
            const segmentDiv = document.createElement('div');
            // Apply Premium Card classes
            segmentDiv.className = `card-premium flex flex-col ${data.style || ''}`;

            const title = document.createElement('h3');
            title.className = `text-xl font-bold mb-4 uppercase tracking-widest text-white`;
            title.innerText = `${index + 1}. ${segment}`;
            // Optional: Add specific icon or particle effect here
            segmentDiv.appendChild(title);

            const toolList = document.createElement('ul');
            toolList.className = "flex-1 space-y-3"; // increased spacing

            data.tools.forEach(tool => {
                const li = document.createElement('li');
                li.className = "cursor-pointer text-gray-400 hover:text-white hover:pl-2 transition-all duration-200 text-sm flex items-center gap-2";

                // Add a small bullet or icon
                const dot = document.createElement('span');
                dot.className = "w-1 h-1 bg-cyan-500 rounded-full";

                li.appendChild(dot);
                li.appendChild(document.createTextNode(tool));

                li.onclick = () => this.launchTool(tool);
                toolList.appendChild(li);
            });

            segmentDiv.appendChild(toolList);
            container.appendChild(segmentDiv);
        });
    },

    async launchTool(toolName) {
        console.log(`Launching tool: ${toolName}`);

        // Dynamic input based on tool
        const input = prompt(`[ASTADIG SECURITY] Enter data for ${toolName} scan:`, "https://example-malware.top");
        if (!input) return;

        const { MalwareEngine } = await import("./malware_engine.js");
        const results = await MalwareEngine.analyze(toolName, input);

        // Simple result display for now - can be enhanced with a nice UI modal later
        const report = `
=== ASTADIG SECURITY REPORT ===
Tool: ${toolName}
Target: ${input}
Threat Level: ${results.threatLevel}%
Status: ${results.status} (${results.label})
Source: ${results.source}
Findings: 
${results.findings.map(f => ` - [!] ${f}`).join('\n')}
===============================
        `;
        alert(report);
    }
};
