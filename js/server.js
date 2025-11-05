// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const pedidosRoutes = require('./routes/pedidos');
const clientesRoutes = require('./routes/clientes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- ROTAS ---
app.use('/api/admin', adminRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/clientes', clientesRoutes);

// --- CONEXÃO COM O MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pedidos_db';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conexão com MongoDB estabelecida com sucesso!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));


// --- 3. ROTAS DA API ---

// --- Clientes (simples) ---
app.post('/api/clientes', async (req, res) => {
    try {
        const novoCliente = new Cliente(req.body);
        const clienteSalvo = await novoCliente.save();
        res.status(201).json(clienteSalvo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ nomeCliente: 1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar clientes', error });
    }
});

// --- Pedidos ---
// Criar novo pedido (e criar/atualizar cliente automaticamente)
app.post('/api/pedidos', async (req, res) => {
    try {
        const dados = req.body;

        // Se precisar, cria ou atualiza o cliente (procura por nome e contato)
        if (dados.nomeCliente) {
            await Cliente.findOneAndUpdate(
                { nomeCliente: dados.nomeCliente, contato: dados.contato || '' },
                { nomeCliente: dados.nomeCliente, contato: dados.contato || '' },
                { upsert: true, new: true }
            );
        }

        const novoPedido = new Pedido({
            legacyId: dados.legacyId || null,
            nomeCliente: dados.nomeCliente,
            contato: dados.contato || '',
            numeroPedido: dados.numeroPedido || '',
            formaPagamento: dados.formaPagamento || 'Pendente',
            dataEntrega: dados.dataEntrega ? new Date(dados.dataEntrega) : null,
            itens: dados.itens || [],
            detalhesTamanho: dados.detalhesTamanho || '',
            valorSinal: parseFloat(dados.valorSinal) || 0,
            valorTotal: parseFloat(dados.valorTotal) || 0,
            status: dados.status || 'A Fazer',
            dataCriacao: dados.dataCriacao ? new Date(dados.dataCriacao) : Date.now()
        });

        const salvo = await novoPedido.save();
        res.status(201).json(salvo);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

// Listar pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ dataEntrega: 1 });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pedidos', error });
    }
});

// Buscar por id (aceita _id do Mongo ou legacyId numérico)
app.get('/api/pedidos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let pedido = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            pedido = await Pedido.findById(id);
        }
        if (!pedido && !isNaN(Number(id))) {
            pedido = await Pedido.findOne({ legacyId: Number(id) });
        }
        if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado' });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pedido', error });
    }
});

// Atualizar pedido (por _id ou legacyId)
app.put('/api/pedidos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dados = req.body;

        let filtro = null;
        if (mongoose.Types.ObjectId.isValid(id)) filtro = { _id: id };
        else if (!isNaN(Number(id))) filtro = { legacyId: Number(id) };
        else return res.status(400).json({ message: 'ID inválido' });

        // Atualiza o cliente também, se necessário
        if (dados.nomeCliente) {
            await Cliente.findOneAndUpdate(
                { nomeCliente: dados.nomeCliente, contato: dados.contato || '' },
                { nomeCliente: dados.nomeCliente, contato: dados.contato || '' },
                { upsert: true, new: true }
            );
        }

        const atualizado = await Pedido.findOneAndUpdate(filtro, {
            $set: {
                nomeCliente: dados.nomeCliente,
                contato: dados.contato || '',
                numeroPedido: dados.numeroPedido || '',
                formaPagamento: dados.formaPagamento || 'Pendente',
                dataEntrega: dados.dataEntrega ? new Date(dados.dataEntrega) : null,
                itens: dados.itens || [],
                detalhesTamanho: dados.detalhesTamanho || '',
                valorSinal: parseFloat(dados.valorSinal) || 0,
                valorTotal: parseFloat(dados.valorTotal) || 0,
                status: dados.status || 'A Fazer'
            }
        }, { new: true });

        if (!atualizado) return res.status(404).json({ message: 'Pedido não encontrado para atualizar' });
        res.json(atualizado);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar pedido', error });
    }
});

// Excluir pedido
app.delete('/api/pedidos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let filtro = null;
        if (mongoose.Types.ObjectId.isValid(id)) filtro = { _id: id };
        else if (!isNaN(Number(id))) filtro = { legacyId: Number(id) };
        else return res.status(400).json({ message: 'ID inválido' });

        const excluido = await Pedido.findOneAndDelete(filtro);
        if (!excluido) return res.status(404).json({ message: 'Pedido não encontrado para excluir' });
        res.json({ message: 'Pedido excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir pedido', error });
    }
});


// --- 4. INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// --- Plans / Subscriptions (básico) ---
const planSchema = new mongoose.Schema({
    name: { type: String, required: true },
    maxClientes: { type: Number, default: 0 },
    priceMonthly: { type: Number, default: 0 }
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

// Criar plano
app.post('/api/plans', async (req, res) => {
    try {
        const novo = new Plan(req.body);
        const salvo = await novo.save();
        res.status(201).json(salvo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Listar planos
app.get('/api/plans', async (req, res) => {
    try {
        const plans = await Plan.find().sort({ priceMonthly: 1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar planos', error });
    }
});

// Rota simples que verifica limites ao criar cliente (opcional)
app.post('/api/clientes/check-create', async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.json({ ok: true }); // sem plano, sem checagem

        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plano não encontrado' });

        const totalClientes = await Cliente.countDocuments();
        if (plan.maxClientes > 0 && totalClientes >= plan.maxClientes) {
            return res.json({ ok: false, reason: 'Limite de clientes atingido' });
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao verificar plano', error });
    }
});