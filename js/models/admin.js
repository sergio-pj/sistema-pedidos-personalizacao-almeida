const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    senha: { 
        type: String, 
        required: true 
    },
    nomeLoja: { 
        type: String, 
        required: true 
    },
    telefone: String,
    plano: {
        type: String,
        enum: ['basic', 'premium'],
        default: 'basic'
    },
    limites: {
        maxClientes: { type: Number, default: 50 },
        maxPedidosMes: { type: Number, default: 100 }
    }
}, { 
    timestamps: true 
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;