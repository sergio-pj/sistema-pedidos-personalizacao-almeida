const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Cliente = require('../models/cliente');

// Usar o middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/clientes - Listar todos os clientes do admin
router.get('/', async (req, res) => {
    try {
        const clientes = await Cliente.find({ adminId: req.admin._id })
                                    .sort({ nomeCliente: 1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar clientes', error });
    }
});

// POST /api/clientes - Criar novo cliente
router.post('/', async (req, res) => {
    try {
        const novoCliente = new Cliente({
            ...req.body,
            adminId: req.admin._id
        });
        const clienteSalvo = await novoCliente.save();
        res.status(201).json(clienteSalvo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findOneAndUpdate(
            { _id: req.params.id, adminId: req.admin._id },
            req.body,
            { new: true }
        );

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/clientes/:id - Excluir cliente
router.delete('/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findOneAndDelete({
            _id: req.params.id,
            adminId: req.admin._id
        });

        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }

        res.json({ message: 'Cliente excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;