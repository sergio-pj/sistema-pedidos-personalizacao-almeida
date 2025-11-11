const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';
let isConnected = false;

const adminSchema = new mongoose.Schema({
    nome: String,
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    nomeLoja: String,
    telefone: String,
    plano: { type: String, default: 'basic' },
    limites: {
        maxClientes: { type: Number, default: 50 },
        maxPedidosMes: { type: Number, default: 100 }
    }
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function connectDB() {
    if (isConnected) return;
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log('✓ Conectado ao MongoDB');
    } catch (err) {
        console.error('✗ Erro MongoDB:', err.message);
        throw err;
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    try {
        await connectDB();
        
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

        return res.status(201).json({
            message: 'Admin cadastrado com sucesso',
            token,
            admin: adminSemSenha
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        return res.status(500).json({ message: 'Erro ao cadastrar admin', error: error.message });
    }
};
