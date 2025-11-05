const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

// Chave secreta para o JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

// Rota de cadastro
router.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, nomeLoja, telefone, plano } = req.body;

        // Verifica se já existe um admin com este email
        const adminExistente = await Admin.findOne({ email });
        if (adminExistente) {
            return res.status(400).json({ message: 'Este e-mail já está em uso' });
        }

        // Criptografa a senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Cria o novo admin
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

        // Gera o token JWT
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove a senha antes de enviar
        const adminSemSenha = { ...admin._doc };
        delete adminSemSenha.senha;

        res.status(201).json({
            message: 'Admin criado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('Erro ao criar admin:', error);
        res.status(500).json({ message: 'Erro ao criar conta' });
    }
});

// Rota de login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Busca o admin pelo email
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'E-mail ou senha inválidos' });
        }

        // Verifica a senha
        const senhaValida = await bcrypt.compare(senha, admin.senha);
        if (!senhaValida) {
            return res.status(401).json({ message: 'E-mail ou senha inválidos' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove a senha antes de enviar
        const adminSemSenha = { ...admin._doc };
        delete adminSemSenha.senha;

        res.json({
            message: 'Login realizado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro ao fazer login' });
    }
});

module.exports = router;