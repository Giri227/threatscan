import { create } from 'zustand';

export const useScanStore = create((set) => ({
    // File scan state
    fileScans: [],
    addFileScan: (scan) => set((state) => ({
        fileScans: [scan, ...state.fileScans].slice(0, 50)
    })),
    clearFileScans: () => set({ fileScans: [] }),

    // URL scan state
    urlScans: [],
    addUrlScan: (scan) => set((state) => ({
        urlScans: [scan, ...state.urlScans].slice(0, 50)
    })),
    clearUrlScans: () => set({ urlScans: [] }),

    // System info
    clientInfo: null,
    setClientInfo: (info) => set({ clientInfo: info }),

    // UI state
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    
    error: null,
    setError: (error) => set({ error }),
    clearError: () => set({ error: null })
}));
