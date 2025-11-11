function validatePedido(req, res, next) {
    const { nomeCliente, itens, valorSinal, valorTotal } = req.body;

    if (req.method === 'POST' && !nomeCliente) {
        return res.status(400).json({ message: 'Nome do cliente é obrigatório' });
    }

    if (itens && Array.isArray(itens)) {
        for (const item of itens) {
            if (item.quantidade && item.quantidade < 1) {
                return res.status(400).json({ message: 'Quantidade deve ser maior que 0' });
            }
            if (item.precoUnitario && item.precoUnitario < 0) {
                return res.status(400).json({ message: 'Preço unitário não pode ser negativo' });
            }
        }
    }

    if (valorSinal !== undefined && valorSinal < 0) {
        return res.status(400).json({ message: 'Valor do sinal não pode ser negativo' });
    }

    if (valorTotal !== undefined && valorTotal < 0) {
        return res.status(400).json({ message: 'Valor total não pode ser negativo' });
    }

    if (valorSinal !== undefined && valorTotal !== undefined && valorSinal > valorTotal) {
        return res.status(400).json({ message: 'Valor do sinal não pode ser maior que o valor total' });
    }

    next();
}

function validateCliente(req, res, next) {
    const { nomeCliente } = req.body;

    if (req.method === 'POST' && !nomeCliente) {
        return res.status(400).json({ message: 'Nome do cliente é obrigatório' });
    }

    if (nomeCliente && typeof nomeCliente !== 'string') {
        return res.status(400).json({ message: 'Nome do cliente deve ser um texto' });
    }

    next();
}

module.exports = {
    validatePedido,
    validateCliente
};
