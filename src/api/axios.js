import axios from 'axios';

// baseURL akan membaca dari environment variable VITE_API_URL
// Jika tidak ada (di mode development lokal), akan otomatis memakai localhost
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: Otomatis menyisipkan Token JWT sebelum request dikirim
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;