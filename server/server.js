// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const pedidosRoutes = require('./routes/pedidos');
const clientesRoutes = require('./routes/clientes');
const planosRoutes = require('./routes/planos');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://sistema-pedidos-personalizacao-almeida.vercel.app',
    'http://127.0.0.1:5500'
  ],
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// --- ROTAS ---
app.use('/api/admin', adminRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/plans', planosRoutes);

const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// --- TRATAMENTO DE ERROS ---
app.use((req, res, next) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
    console.error('Erro:', err.message);
    res.status(err.status || 500).json({ 
        message: err.message || 'Erro interno do servidor' 
    });
});

// --- CONEXÃO COM O MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sistema_pedidos';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✓ Conexão com MongoDB estabelecida com sucesso!');
        app.listen(PORT, () => {
            console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('✗ Erro ao conectar ao MongoDB:', err.message);
        console.error('Verifique se a MONGO_URI está configurada corretamente no arquivo .env');
        process.exit(1);
    });