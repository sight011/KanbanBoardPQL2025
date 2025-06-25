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
        
        // Debug: Log request details
        console.log('🚀 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            withCredentials: config.withCredentials,
            headers: config.headers
        });
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
api.interceptors.response.use(
    (response) => {
        console.log('✅ API Response:', {
            status: response.status,
            url: response.config.url,
            method: response.config.method?.toUpperCase()
        });
        return response;
    },
    (error) => {
        console.log('❌ API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            message: error.response?.data?.error || error.message
        });
        return Promise.reject(error);
    }
);

export default api; 