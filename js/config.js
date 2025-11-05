// config.js
const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://sistema-pedidos-personalizacao-almeida.vercel.app/api'
    : 'http://localhost:3000/api';