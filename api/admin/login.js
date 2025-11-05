// api/admin/login.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { email, senha } = req.body;

  // Simulação de verificação (substitua com MongoDB depois)
  if (email === 'admin@email.com' && senha === '123456') {
    return res.status(200).json({
      token: 'abc123',
      admin: {
        nome: 'Admin',
        email,
        _id: 'admin123'
      }
    });
  } else {
    return res.status(401).json({ message: 'E-mail ou senha inválidos' });
  }
}
