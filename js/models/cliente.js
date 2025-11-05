const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    nomeCliente: { 
        type: String, 
        required: true 
    },
    contato: { 
        type: String, 
        default: '' 
    },
    endereco: { 
        type: String, 
        default: "" 
    }
}, { 
    timestamps: true 
});

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;