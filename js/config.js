// config.js - Configuração centralizada da API
const API_CONFIG = {
    getApiUrl: () => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return 'http://localhost:3000/api';
        }
        if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        return 'https://sistema-pedidos-personalizacao-almeida.vercel.app/api';
    }
};

if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
}