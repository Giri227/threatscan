import { TOOL_MAP } from "./tools.js";

export const Dashboard = {
    map: null,

    init() {
        this.loadView('home');
        this.loadRecentLogs();
    },

    async loadView(viewName) {
        const stage = document.getElementById('dynamic-stage');
        this.updateSidebarActive(viewName);

        if (viewName === 'home') {
            // Check if Home is already active (to avoid re-render loop, but allow switching back)
            // A simple check is if #map exists. But if we switched away, #map won't exist.
            if (!document.getElementById('map')) {
                stage.innerHTML = `
                <div class="flex flex-[3] gap-6 min-h-0 mb-4 h-full">
                    <div class="flex-1 relative border border-white/10 rounded-xl overflow-hidden bg-black shadow-2xl">
                        <div id="map" class="h-full w-full"></div>
                        <div class="absolute top-6 left-6 z-[500]">
                            <div class="bg-black/90 border border-neon px-4 py-2 rounded-md shadow-[0_0_15px_var(--glow)]">
                                <span id="map-status" class="text-xs font-black tracking-[4px] text-neon uppercase animate-pulse">ASN_NODE_ONLINE</span>
                            </div>
                        </div>
                    </div>

                    <div class="w-96 bg-[#0c0c0f] border border-white/10 rounded-xl p-8 flex flex-col gap-8 shadow-2xl relative">
                        <div class="mood-overlay flex gap-2 bg-black/60 rounded-lg p-2 border border-white/5">
                            <button onclick="Flux.set('calm')" class="mood-btn">CALM</button>
                            <button onclick="Flux.set('anxious')" class="mood-btn">ANXIOUS</button>
                            <button onclick="Flux.set('stealth')" class="mood-btn">STEALTH</button>
                            <button onclick="Flux.set('overload')" class="mood-btn">OVERLOAD</button>
                        </div>

                        <div class="space-y-8">
                            <div class="data-row">
                                <span class="text-[9px] opacity-30 uppercase tracking-widest block mb-2">Network_Address</span>
                                <span class="text-neon text-3xl font-black block" id="user-ip">DETECTING...</span>
                            </div>
                            <div class="data-row">
                                <span class="text-[9px] opacity-30 uppercase tracking-widest block mb-2">ASN_Organization</span>
                                <span class="text-white text-lg font-bold block" id="user-isp">ENCRYPTED</span>
                            </div>
                            <div class="data-row">
                                <span class="text-[9px] opacity-30 uppercase tracking-widest block mb-2">Geo_Coordinate</span>
                                <span class="text-white text-lg font-medium block" id="user-loc">TRIANGULATING...</span>
                            </div>
                        </div>

                        <div class="mt-auto pt-4 border-t border-white/5 flex items-center gap-4">
                            <div class="w-2 h-2 rounded-full bg-neon animate-ping"></div>
                            <span class="text-[10px] font-bold opacity-30 tracking-[4px]">SECURE_LINK_ESTABLISHED</span>
                        </div>
                    </div>
                </div>
            `;
            }
            await this.initGeolocation();
        } else if (viewName === 'system-intelligence') {
            stage.innerHTML = `
                <div class="card-premium flex flex-col h-full gap-4">
                    <div class="flex justify-between items-center border-b border-white/10 pb-4">
                        <div>
                            <h2 class="text-3xl font-black text-white">SYSTEM INTELLIGENCE</h2>
                            <p class="text-[9px] text-cyan-500 tracking-[3px]">REGIONAL_IDENTITY_SCAN // NODE_CONNECTED</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-gray-500 block">PRECISION_MODE</span>
                            <span class="text-xs font-bold text-neon">ACTIVE</span>
                        </div>
                    </div>
                    
                    <div class="flex-1 flex gap-4 min-h-0">
                        <div class="flex-1 relative border border-white/5 rounded-lg overflow-hidden bg-black/40">
                             <div id="intel-map" class="h-full w-full"></div>
                        </div>
                        <div class="w-80 space-y-4 overflow-y-auto pr-2">
                            <div class="bg-white/5 p-4 border-l-2 border-cyan-500">
                                <span class="text-[9px] text-gray-500 block">LOCAL_IDENTITY</span>
                                <span id="intel-ip" class="text-xl font-black text-white">SCANNING...</span>
                            </div>
                            <div class="bg-white/5 p-4 border-l-2 border-cyan-500">
                                <span class="text-[9px] text-gray-500 block">ISP_UPLINK</span>
                                <span id="intel-isp" class="text-sm font-bold text-gray-300">WAITING...</span>
                            </div>
                            <div id="intel-details" class="text-[10px] space-y-2 text-gray-500">
                                <div class="flex justify-between"><span>LATITUDE:</span><span class="text-white">---</span></div>
                                <div class="flex justify-between"><span>LONGITUDE:</span><span class="text-white">---</span></div>
                                <div class="flex justify-between"><span>CITY:</span><span class="text-white">---</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => this.initIntelMap(), 100);

        } else {
            const segment = TOOL_MAP[viewName];
            stage.innerHTML = `
                <div class="card-premium border-l-4 border-cyan-500 p-8 h-full flex flex-col">
                    <h2 class="text-4xl font-black text-white mb-2 tracking-tighter">${viewName.toUpperCase()}</h2>
                    <p class="text-xs text-gray-500 mb-8 tracking-widest uppercase">/ ACTIVE SECURITY SEGMENT / INFRASTRUCTURE LAYER /</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                        <div class="space-y-4">
                            <h3 class="text-sm font-bold text-cyan-400">AVAILABLE SUB-TOOLS:</h3>
                            <div class="flex flex-wrap gap-2">
                                ${segment ? segment.tools.map(tool => `<span class="bg-white/5 border border-white/10 px-3 py-2 text-[10px] hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition cursor-pointer select-none">${tool}</span>`).join('') : '<span class="text-red-500">MODULE_OFFLINE</span>'}
                            </div>
                        </div>
                        <div class="bg-black/40 p-6 border border-white/5 rounded relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"></div>
                            <p class="text-[11px] leading-relaxed text-gray-400">
                                This segment manages the specific protocols related to ${viewName.toUpperCase()}. 
                                All data investigated here is processed through the Synesthetic Flux engine for real-time risk assessment.
                            </p>
                            <button class="mt-6 w-full py-4 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 text-[10px] font-bold tracking-widest hover:bg-cyan-500 hover:text-black transition duration-300">
                                [ INITIALIZE FULL MODULE ]
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    async initGeolocation() {
        // Defer to the User's Inline Script logic
        if (window.initGeo) {
            console.log("Delegating Map Init to User Script...");
            await window.initGeo();
        } else {
            console.warn("User Script initGeo not found.");
        }
    },

    async initIntelMap() {
        const map = L.map('intel-map', { zoomControl: false }).setView([20, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();

            document.getElementById('intel-ip').innerText = data.ip;
            document.getElementById('intel-isp').innerText = data.org;
            document.getElementById('intel-details').innerHTML = `
                <div class="flex justify-between"><span>LATITUDE:</span><span class="text-white">${data.latitude}</span></div>
                <div class="flex justify-between"><span>LONGITUDE:</span><span class="text-white">${data.longitude}</span></div>
                <div class="flex justify-between"><span>CITY:</span><span class="text-white">${data.city}</span></div>
            `;

            const coords = [data.latitude, data.longitude];
            map.flyTo(coords, 10);
            L.circle(coords, { radius: 10000, color: 'cyan', fillOpacity: 0.2 }).addTo(map);
            L.marker(coords).addTo(map);
        } catch (e) { console.error("Intel Map Error", e); }
    },

    async loadRecentLogs() {
        const logContainer = document.getElementById('recent-logs');
        if (!logContainer) return;

        try {
            const { collection, query, orderBy, limit, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const { db } = await import("./auth.js");
            const { encryp_ai } = await import("./encrypAI.js");

            onSnapshot(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(5)), (snapshot) => {
                logContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    let decrypted = "ENCRYPTED_DATA";
                    try {
                        decrypted = encryp_ai.decrypt(data.payload);
                    } catch (e) { }

                    const parts = Object.fromEntries(decrypted.split('|').map(s => s.split(':')));

                    const logEl = document.createElement('div');
                    logEl.className = "p-2 bg-white/5 rounded border-l border-cyan-500/30 text-[8px]";
                    logEl.innerHTML = `
                        <div class="flex justify-between text-cyan-400">
                            <span>${parts.ACT || 'SYSTEM_EVENT'}</span>
                            <span class="text-gray-600">${new Date(data.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div class="text-white truncate">${parts.USER || 'Anonymous'}</div>
                    `;
                    logContainer.appendChild(logEl);
                });
            });
        } catch (e) { console.error("Logs Fetch Error", e); }
    },

    updateSidebarActive(viewName) {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('active');
            // Simplified match logic
            const txt = el.innerText.toLowerCase();
            if ((viewName === 'home' && txt.includes('home')) || txt.includes(viewName)) {
                el.classList.add('active');
            }
        });
    }
};
