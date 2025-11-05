const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    nome: String,
    qtd: Number,
    precoUn: Number,
    totalLinha: Number
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    legacyId: { 
        type: Number, 
        default: null 
    },
    nomeCliente: { 
        type: String, 
        required: true 
    },
    contato: { 
        type: String, 
        default: '' 
    },
    numeroPedido: { 
        type: String, 
        default: '' 
    },
    formaPagamento: { 
        type: String, 
        default: 'Pendente' 
    },
    dataEntrega: { 
        type: Date 
    },
    itens: [itemSchema],
    detalhesTamanho: { 
        type: String, 
        default: '' 
    },
    valorSinal: { 
        type: Number, 
        default: 0 
    },
    valorTotal: { 
        type: Number, 
        default: 0 
    },
    status: { 
        type: String, 
        default: 'A Fazer' 
    }
}, { 
    timestamps: true 
});

const Pedido = mongoose.model('Pedido', pedidoSchema);

module.exports = Pedido;