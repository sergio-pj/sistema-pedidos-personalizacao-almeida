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

  if (!isConnected) {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
  }

  const { email, senha } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos' });
  }

  const senhaValida = await bcrypt.compare(senha, admin.senha);
  if (!senhaValida) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos' });
  }

  const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '7d' });

  const adminSemSenha = { ...admin.toObject() };
  delete adminSemSenha.senha;

  res.json({
    message: 'Login realizado com sucesso',
    token,
    admin: adminSemSenha
  });
}
