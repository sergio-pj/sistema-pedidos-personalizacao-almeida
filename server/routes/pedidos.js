const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Pedido = require('../models/pedido');
const Cliente = require('../models/cliente');
const mongoose = require('mongoose');

// Usar o middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/pedidos - Listar todos os pedidos do admin
router.get('/', async (req, res) => {
    try {
        const pedidos = await Pedido.find({ adminId: req.admin._id })
                                  .sort({ createdAt: -1 });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pedidos', error });
    }
});

// POST /api/pedidos - Criar novo pedido
router.post('/', async (req, res) => {
    try {
        const dados = req.body;

        // Se precisar, cria ou atualiza o cliente
        if (dados.nomeCliente) {
            await Cliente.findOneAndUpdate(
                { 
                    adminId: req.admin._id,
                    nomeCliente: dados.nomeCliente,
                    contato: dados.contato || '' 
                },
                { 
                    adminId: req.admin._id,
                    nomeCliente: dados.nomeCliente,
                    contato: dados.contato || '' 
                },
                { upsert: true, new: true }
            );
        }

        const novoPedido = new Pedido({
            ...dados,
            adminId: req.admin._id
        });

        const pedidoSalvo = await novoPedido.save();
        res.status(201).json(pedidoSalvo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/pedidos/:id - Atualizar pedido
router.put('/:id', async (req, res) => {
    try {
        const identifier = req.params.id;
        const orQueries = [];
        if (mongoose.Types.ObjectId.isValid(identifier)) orQueries.push({ _id: identifier });
        if (!isNaN(Number(identifier))) orQueries.push({ legacyId: Number(identifier) });

        if (orQueries.length === 0) {
            return res.status(400).json({ message: 'Identificador inválido' });
        }

        const pedido = await Pedido.findOneAndUpdate(
            { adminId: req.admin._id, $or: orQueries },
            req.body,
            { new: true }
        );

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        res.json(pedido);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/pedidos/:id - Excluir pedido
router.delete('/:id', async (req, res) => {
    try {
        const identifier = req.params.id;
        const orQueries = [];
        if (mongoose.Types.ObjectId.isValid(identifier)) orQueries.push({ _id: identifier });
        if (!isNaN(Number(identifier))) orQueries.push({ legacyId: Number(identifier) });

        if (orQueries.length === 0) {
            return res.status(400).json({ message: 'Identificador inválido' });
        }

        const pedido = await Pedido.findOneAndDelete({ adminId: req.admin._id, $or: orQueries });

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado' });
        }

        res.json({ message: 'Pedido excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;