import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Admin from '../../models/admin';

const JWT_SECRET = process.env.JWT_SECRET;

let isConnected = false;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    if (!isConnected) {
      await mongoose.connect(process.env.MONGO_URI);
      isConnected = true;
    }

    const { nome, email, senha, nomeLoja, telefone, plano } = req.body;

    if (!nome || !email || !senha || !nomeLoja || !telefone || !plano) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
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
      telefone,
      plano,
      limites
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
}
