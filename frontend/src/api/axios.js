import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true,
});

// Add request interceptor to include company context
api.interceptors.request.use(
    (config) => {
        // Get company slug from localStorage (set after login/registration)
        const companySlug = localStorage.getItem('companySlug');
        if (companySlug) {
            config.headers['X-Company-Slug'] = companySlug;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api; 