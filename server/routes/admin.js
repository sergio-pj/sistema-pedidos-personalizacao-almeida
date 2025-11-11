const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

// POST /api/admin/register - Cadastrar novo admin
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha, nomeLoja, telefone, plano } = req.body;

        if (!nome || !email || !senha || !nomeLoja) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando' });
        }

        const adminExistente = await Admin.findOne({ email });
        if (adminExistente) {
            return res.status(400).json({ message: 'Este e-mail já está em uso' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const limites = plano === 'premium'
            ? { maxClientes: 1000, maxPedidosMes: 1000 }
            : { maxClientes: 50, maxPedidosMes: 100 };

        const admin = new Admin({
            nome,
            email,
            senha: senhaHash,
            nomeLoja,
            telefone: telefone || '',
            plano: plano || 'basic',
            limites
        });

        await admin.save();

        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const adminSemSenha = admin.toObject();
        delete adminSemSenha.senha;

        res.status(201).json({
            message: 'Admin cadastrado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('Erro ao cadastrar admin:', error);
        res.status(500).json({ message: 'Erro ao cadastrar admin', error: error.message });
    }
});

// POST /api/admin/login - Fazer login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'E-mail ou senha inválidos' });
        }

        const senhaValida = await bcrypt.compare(senha, admin.senha);
        if (!senhaValida) {
            return res.status(401).json({ message: 'E-mail ou senha inválidos' });
        }

        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const adminSemSenha = admin.toObject();
        delete adminSemSenha.senha;

        res.status(200).json({
            message: 'Login realizado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
    }
});

module.exports = router;
