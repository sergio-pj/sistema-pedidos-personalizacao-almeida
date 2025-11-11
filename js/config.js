// config.js - Configuração centralizada da API
const API_CONFIG = {
    getApiUrl: () => {
        // Se estiver em localhost, usa localhost:3000
        if (typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return 'http://localhost:3000/api';
        }
        // Em produção (Vercel), usa URL relativa (mesmo domínio)
        return '/api';
    }
};

if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
}