export const Flux = {
    state: 'calm',

    init() {
        this.set('calm');
    },

    set(newState) {
        this.state = newState;
        const root = document.documentElement;
        document.body.dataset.state = newState;

        const moods = {
            calm: { accent: '#00F0FF', bg: '#0c0c0e', pulse: '2s' },
            anxious: { accent: '#FF0055', bg: '#0d0000', pulse: '0.5s' },
            stealth: { accent: '#00FF41', bg: '#000500', pulse: '4s' },
            overload: { accent: '#BC13FE', bg: '#05000a', pulse: '0.1s' }
        };

        const theme = moods[newState];
        root.style.setProperty('--neon-cyan', theme.accent);
        root.style.setProperty('--bg-color', theme.bg);

        console.log(`FLUX_STATE_UPDATE: ${newState.toUpperCase()}`);
    }
};