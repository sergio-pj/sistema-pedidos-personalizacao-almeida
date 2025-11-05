const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

// Chave secreta para o JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

const authMiddleware = async (req, res, next) => {
    try {
        // Pega o token do header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
        }

        // Verifica o token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Busca o admin
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({ message: 'Acesso negado. Admin não encontrado.' });
        }

        // Adiciona o admin ao request
        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Acesso negado. Token inválido.' });
    }
};

module.exports = authMiddleware;