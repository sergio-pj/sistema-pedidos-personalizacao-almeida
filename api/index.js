require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('../server/routes/admin');
const pedidosRoutes = require('../server/routes/pedidos');
const clientesRoutes = require('../server/routes/clientes');
const planosRoutes = require('../server/routes/planos');

const app = express();

// --- MIDDLEWARES ---
// CORS configurado ANTES de tudo
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// --- CONEXÃO COM O MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sistema_pedidos';

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        console.log('Usando conexão existente do MongoDB');
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('✓ Nova conexão com MongoDB estabelecida');
    } catch (err) {
        console.error('✗ Erro ao conectar ao MongoDB:', err.message);
        throw err;
    }
}

// --- ROTAS ---
app.use('/api/admin', async (req, res, next) => {
    await connectDB();
    next();
}, adminRoutes);

app.use('/api/pedidos', async (req, res, next) => {
    await connectDB();
    next();
}, pedidosRoutes);

app.use('/api/clientes', async (req, res, next) => {
    await connectDB();
    next();
}, clientesRoutes);

app.use('/api/plans', async (req, res, next) => {
    await connectDB();
    next();
}, planosRoutes);

// Health check
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'API está funcionando!' });
});

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

// Export para Vercel Serverless
module.exports = app;
