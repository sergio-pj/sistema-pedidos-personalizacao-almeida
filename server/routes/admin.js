const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

// Chave secreta para o JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET não definida no .env. Usando valor padrão inseguro.');
}

// Rota de cadastro
router.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, nomeLoja, telefone, plano } = req.body;

        if (!nome || !email || !senha || !nomeLoja || !telefone || !plano) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
        }

        const adminExistente = await Admin.findOne({ email });
        if (adminExistente) {
            return res.status(400).json({ message: 'Este e-mail já está em uso' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const admin = new Admin({
            nome,
            email,
            senha: senhaHash,
            nomeLoja,
            telefone,
            plano,
            limites: plano === 'premium' ? {
                maxClientes: 1000,
                maxPedidosMes: 1000
            } : {
                maxClientes: 50,
                maxPedidosMes: 100
            }
        });

        await admin.save();

        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const adminSemSenha = { ...admin.toObject() };
        delete adminSemSenha.senha;

        res.status(201).json({
            message: 'Admin criado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('❌ Erro ao criar admin:', error);
        res.status(500).json({ message: 'Erro ao criar conta' });
    }
});

// Rota de login
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

        const adminSemSenha = { ...admin.toObject() };
        delete adminSemSenha.senha;

        res.json({
            message: 'Login realizado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('❌ Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro ao fazer login' });
    }
});

module.exports = router;
