/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    app: 'var(--bg-app)',
                    panel: 'var(--bg-panel)',
                    card: 'var(--bg-card)',
                    grid: 'var(--bg-grid)',
                },
                accent: {
                    cyan: 'var(--accent-cyan)',
                    purple: 'var(--accent-purple)',
                    violet: 'var(--accent-violet)',
                },
                status: {
                    safe: 'var(--status-safe)',
                    warning: 'var(--status-warning)',
                    danger: 'var(--status-danger)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'Space Grotesk', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                card: 'var(--shadow-card)',
                glow: 'var(--shadow-glow)',
            }
        },
    },
    plugins: [],
}
