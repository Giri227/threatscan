import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://threatscan-api.onrender.com/api' : 'http://localhost:5000/api');

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor
api.interceptors.request.use(
    config => {
        return config;
    },
    error => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 429) {
            throw new Error('Rate limited. Please try again later.');
        }
        if (error.response?.status === 413) {
            throw new Error('File size exceeds maximum limit.');
        }
        throw error;
    }
);

export const scanFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/scan/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const scanUrl = async (url) => {
    return api.post('/scan/url', { url });
};

export const getClientInfo = async () => {
    return api.get('/system/client-info');
};

export const getHealth = async () => {
    return api.get('/health');
};

export const getDashboardIntelligence = () => api.get('/dashboard/intelligence');

export default api;
