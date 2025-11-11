const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    maxClientes: { type: Number, default: 0 },
    priceMonthly: { type: Number, default: 0 }
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const plans = await Plan.find().sort({ priceMonthly: 1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar planos', error });
    }
});

router.post('/', async (req, res) => {
    try {
        const novo = new Plan(req.body);
        const salvo = await novo.save();
        res.status(201).json(salvo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
