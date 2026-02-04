import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import NeuralCore from './components/NeuralCore'

import DashboardIntelligence from './pages/DashboardIntelligence'
import FileScanView from './pages/FileScanView'
import SystemInfoView from './pages/SystemInfoView'
import URLAnalysisView from './pages/URLAnalysisView'
import NetworkView from './pages/NetworkView'

import { useLocation, AnimatePresence } from 'react-router-dom';

// Placeholder views for now
const ComingSoon = ({ title }) => (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-24 h-24 rounded-3xl border flex items-center justify-center mb-8" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
            <div className="w-12 h-12 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-cyan)', borderTopColor: 'transparent' }} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="uppercase tracking-widest text-xs font-bold leading-relaxed opacity-60" style={{ color: 'var(--text-secondary)' }}>
            Core module integration in progress.<br />
            Heuristic nodes currently offline for this vector.
        </p>
    </div>
)
const ServerOfflineOverlay = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
        <div className="p-8 rounded-3xl bg-slate-900 border border-red-500/20 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Secure Core Unreachable</h2>
            <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                The analysis engine is currently offline or unreachable. Security protocols have suspended the dashboard to prevent data loss.
            </p>
            <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
                Retrying Connection...
            </div>
        </div>
    </div>
);

const AppContent = () => {
    const location = useLocation();
    const isRoot = location.pathname === '/';
    const [isServerOnline, setIsServerOnline] = React.useState(true);

    React.useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/health`);
                if (res.ok) setIsServerOnline(true);
                else throw new Error('Health check failed');
            } catch (err) {
                console.warn('Server offline:', err);
                setIsServerOnline(false);
            }
        };
        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-screen w-screen flex overflow-hidden relative" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
            {!isServerOnline && <ServerOfflineOverlay />}

            {/* ⚛️ PERVASIVE NEURAL CORE BACKGROUND */}
            <div className={`fixed inset-0 z-0 transition-all duration-1000 ${!isRoot ? 'scale-75 blur-3xl opacity-20 translate-x-[-15%]' : 'scale-100 opacity-100'}`}>
                <NeuralCore />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10 h-full">
                <Header />

                <main className="flex-1 overflow-hidden relative h-full">
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={null} /> {/* Root is handled by the background NeuralCore */}

                            {/* Orbital Sub-Views */}
                            <Route path="/file" element={
                                <div className="h-full w-full p-4 md:p-12 overflow-y-auto custom-scrollbar flex items-center justify-center">
                                    <motion.div
                                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                                        className="w-full max-w-5xl glass-mesh rounded-[2.5rem] p-6 md:p-10 shadow-2xl"
                                    >
                                        <FileScanView />
                                    </motion.div>
                                </div>
                            } />

                            <Route path="/url" element={
                                <div className="h-full w-full p-4 md:p-12 overflow-y-auto custom-scrollbar flex items-center justify-center">
                                    <motion.div
                                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                                        className="w-full max-w-5xl glass-mesh rounded-[2.5rem] p-6 md:p-10 shadow-2xl"
                                    >
                                        <URLAnalysisView />
                                    </motion.div>
                                </div>
                            } />

                            <Route path="/system" element={
                                <div className="h-full w-full p-4 md:p-12 overflow-y-auto custom-scrollbar flex items-center justify-center">
                                    <motion.div
                                        initial={{ opacity: 0, y: 100 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -100 }}
                                        className="w-full max-w-5xl glass-mesh rounded-[2.5rem] p-6 md:p-10"
                                    >
                                        <SystemInfoView />
                                    </motion.div>
                                </div>
                            } />

                            <Route path="/network" element={
                                <div className="h-full w-full p-4 md:p-12 overflow-y-auto custom-scrollbar">
                                    <NetworkView />
                                </div>
                            } />

                            <Route path="/settings" element={<ComingSoon title="Node Configuration" />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AnimatePresence>
                </main>
            </div>

            {/* Floating Toaster */}
            <Toaster position="top-right" />
        </div>
    );
};

function App() {
    return (
        <Router basename={import.meta.env.BASE_URL}>
            <AppContent />
        </Router>
    )
}


export default App
