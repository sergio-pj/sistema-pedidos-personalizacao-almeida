// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const pedidosRoutes = require('./routes/pedidos');
const clientesRoutes = require('./routes/clientes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://sistema-pedidos-personalizacao-almeida.vercel.app',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

app.use(express.json());

// --- ROTAS ---
app.use('/api/admin', adminRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/clientes', clientesRoutes);

const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));


// --- CONEXÃO COM O MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sistema_pedidos';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Conexão com MongoDB estabelecida com sucesso!');
        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB:', err);
    });