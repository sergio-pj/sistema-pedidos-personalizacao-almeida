// --- FUNÇÃO DE UTILIDADE ---
function gerarId() {
    // Retorna o timestamp atual (em milissegundos) como ID único.
    return Date.now();
}

// Função para calcular e exibir o resumo financeiro no Dashboard
function calcularResumoFinanceiro(pedidos) {
    const totalPendentesElement = document.getElementById('contagemPendentes'); 
    const faturamentoTotalElement = document.getElementById('faturamentoTotal');
    const valorFaturadoElement = document.getElementById('valorFaturado'); 

    if (!faturamentoTotalElement || !valorFaturadoElement || !totalPendentesElement) {
        return;
    }
    
    // Calcula o total geral (todos os pedidos, abertos ou entregues)
    const totalGeral = pedidos.reduce((acc, pedido) => acc + (parseFloat(pedido.valorTotal) || 0), 0);
    // Filtra e calcula o total faturado (apenas pedidos 'Entregue')
    const pedidosEntregues = pedidos.filter(p => p.status === 'Entregue');
    const totalFaturado = pedidosEntregues.reduce((acc, pedido) => acc + (parseFloat(pedido.valorTotal) || 0), 0);
    // Filtra os pedidos pendentes
    const pedidosPendentes = pedidos.filter(p => p.status !== 'Entregue');

    // Formatador de moeda
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Atualiza os elementos no DOM
    faturamentoTotalElement.textContent = formatter.format(totalGeral);
    valorFaturadoElement.textContent = formatter.format(totalFaturado);
    totalPendentesElement.textContent = pedidosPendentes.length;
}


// --- FUNÇÃO PARA O DASHBOARD (index.html) ---
function carregarPedidos() {
    const tabelaBody = document.querySelector('#tabelaPedidos tbody');

    if (!tabelaBody) return; 

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    tabelaBody.innerHTML = ''; 
    
    // 1. Mostra apenas pedidos NÃO Entregues no Dashboard
    const pedidosPendentes = pedidos.filter(pedido => pedido.status !== 'Entregue');
    // Ordena pelo prazo de entrega mais próximo
    pedidosPendentes.sort((a, b) => new Date(a.dataEntrega) - new Date(b.dataEntrega));

    // 2. Atualiza o resumo financeiro com TODOS os pedidos
    calcularResumoFinanceiro(pedidos);

    // 3. Verifica se há pendentes para exibir
    if (pedidosPendentes.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="6">Todos os pedidos foram entregues.</td></tr>';
        return;
    }

    // 4. Cria as linhas da tabela
    pedidosPendentes.forEach(pedido => {
        const linha = tabelaBody.insertRow();
        
        linha.insertCell().textContent = pedido.status; 
        linha.insertCell().textContent = pedido.dataEntrega; 
        linha.insertCell().textContent = pedido.nomeCliente;

        const servicoCell = linha.insertCell();
        const primeiraDescricao = pedido.itens && pedido.itens.length > 0 
            ? `${pedido.itens.length} itens (Ex: ${pedido.itens[0].nome})` 
            : ('Detalhes do Serviço');

        // Adiciona link do WhatsApp para contato
        servicoCell.innerHTML = `
            ${primeiraDescricao}<br>
            <a href="https://wa.me/55${(pedido.contato || '').replace(/\D/g, '')}" target="_blank" class="link-whatsapp">
                (Contato: ${pedido.contato || 'N/A'})
            </a>
        `;
        
        // --- ALTERAÇÃO AQUI: EXIBE O VALOR RESTANTE NA COLUNA "VALOR" ---
        const valorTotal = parseFloat(pedido.valorTotal || 0);
        const valorSinal = parseFloat(pedido.valorSinal || 0);
        const valorRestante = valorTotal - valorSinal;
        linha.insertCell().textContent = `R$ ${valorRestante.toFixed(2).replace('.', ',')}`; // Valor Restante
        
        const acoesCell = linha.insertCell();
        // Botões de Ação
        acoesCell.innerHTML = `
            <button class="btn-editar btn-os" data-pedido-id="${pedido.id}" onclick="window.location.href='os.html?id=${pedido.id}'">Ver OS</button>
            <button class="btn-acao" data-pedido-id="${pedido.id}" onclick="marcarComoEntregue(event)">Concluir</button>
        `;
        
        // Adiciona classe de atraso se a data de entrega passou
        if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
}


// --- FUNÇÃO PARA O HISTÓRICO DE CLIENTES (historico.html) ---
function buscarHistorico() {
    // Pega o valor de busca, corrigido para verificar a existência do elemento
    const inputBusca = document.getElementById('inputBuscaCliente'); 
    const nomeBusca = inputBusca?.value.trim().toLowerCase() || ""; 
    const tabelaBody = document.querySelector('#tabelaHistorico tbody');

    if (!tabelaBody) return; 

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    tabelaBody.innerHTML = ''; 
    
    // Filtra pelo nome do cliente
    const pedidosFiltrados = pedidos.filter(pedido => 
        nomeBusca === "" || (pedido.nomeCliente || '').toLowerCase().includes(nomeBusca)
    );

    // Ordena pela data de entrega mais recente primeiro
    pedidosFiltrados.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));
    
    if (pedidosFiltrados.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="6">${pedidos.length === 0 ? 'Nenhum pedido cadastrado.' : 'Nenhum pedido encontrado para o cliente pesquisado.'}</td></tr>`;
        return;
    }

    // Cria as linhas da tabela
    pedidosFiltrados.forEach(pedido => {
        const linha = tabelaBody.insertRow();
        
        linha.insertCell().textContent = pedido.status; 
        linha.insertCell().textContent = pedido.dataEntrega; 
        linha.insertCell().textContent = pedido.nomeCliente;

        const servicoCell = linha.insertCell();
        const primeiraDescricao = pedido.itens && pedido.itens.length > 0 
            ? `${pedido.itens.length} itens (Ex: ${pedido.itens[0].nome})` 
            : ('Detalhes do Serviço');

        servicoCell.innerHTML = `
            ${primeiraDescricao}<br>
            <a href="https://wa.me/55${(pedido.contato || '').replace(/\D/g, '')}" target="_blank" class="link-whatsapp">
                (Contato: ${pedido.contato || 'N/A'})
            </a>
        `;
        
        // --- ALTERAÇÃO AQUI: EXIBE O VALOR RESTANTE NA COLUNA "VALOR" ---
        const valorTotal = parseFloat(pedido.valorTotal || 0);
        const valorSinal = parseFloat(pedido.valorSinal || 0);
        const valorRestante = valorTotal - valorSinal;
        linha.insertCell().textContent = `R$ ${valorRestante.toFixed(2).replace('.', ',')}`; // Valor Restante
        
        const acoesCell = linha.insertCell();
        
        // Ações no Histórico (Concluir, Reabrir e Excluir)
        acoesCell.innerHTML = `
            <button class="btn-editar btn-os" data-pedido-id="${pedido.id}" onclick="window.location.href='os.html?id=${pedido.id}'">Ver OS</button>
            ${pedido.status === 'Entregue' ? 
                `<button class="btn-acao btn-reabrir" data-pedido-id="${pedido.id}" onclick="reabrirPedido(event)">Reabrir</button>` : 
                `<button class="btn-acao" data-pedido-id="${pedido.id}" onclick="marcarComoEntregue(event)">Concluir</button>`
            }
            <button class="btn-excluir" data-pedido-id="${pedido.id}" onclick="excluirPedido(event)">Excluir</button>
        `;

        // Adiciona classes de status para estilização
        if (pedido.status === 'Entregue') {
            linha.classList.add('pedido-entregue');
        } else if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
}

// --- Funções de Ação (marcarComoEntregue, reabrirPedido, excluirPedido) ---

function marcarComoEntregue(event) {
    const pedidoId = parseInt(event.target.dataset.pedidoId); 
    let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
    
    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex].status = "Entregue";
        localStorage.setItem('pedidos_loja', JSON.stringify(pedidos));
        
        // Recarrega a tabela correta dependendo da página
        if (document.querySelector('#tabelaPedidos')) { carregarPedidos(); } 
        else if (document.querySelector('#tabelaHistorico')) { buscarHistorico(); }
    } else {
        alert("Erro: Pedido não encontrado.");
    }
}

function reabrirPedido(event) {
    const pedidoId = parseInt(event.target.dataset.pedidoId); 
    let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
    
    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex].status = "A Fazer"; // Status reaberto
        localStorage.setItem('pedidos_loja', JSON.stringify(pedidos));
        alert("Pedido reaberto com sucesso. Ele voltou para o Dashboard.");
        buscarHistorico(); // Recarrega a tabela de Histórico
    } else {
        alert("Erro: Pedido não encontrado.");
    }
}

function excluirPedido(event) {
    const pedidoId = parseInt(event.target.dataset.pedidoId);
    const confirmacao = confirm("Tem certeza de que deseja excluir este pedido? Esta ação não pode ser desfeita.");

    if (confirmacao) {
        const novosPedidos = (JSON.parse(localStorage.getItem('pedidos_loja')) || []).filter(p => p.id !== pedidoId);

        localStorage.setItem('pedidos_loja', JSON.stringify(novosPedidos));
        // Recarrega a tabela correta dependendo da página
        if (document.querySelector('#tabelaPedidos')) { carregarPedidos(); } 
        else if (document.querySelector('#tabelaHistorico')) { buscarHistorico(); }
    }
}


// --- Funções da Tabela de Itens (novo-pedido.html) ---

function adicionarItem(itemData = {}) {
    const corpoTabela = document.getElementById('corpoTabelaItens');
    if (!corpoTabela) return;

    const novaLinha = corpoTabela.insertRow();
    novaLinha.classList.add('linha-item');

    // Coluna 1: Item (Nome)
    const itemCell = novaLinha.insertCell();
    itemCell.innerHTML = `<input type="text" class="input-item-nome" placeholder="Camiseta, Caneca, etc." value="${itemData.nome || ''}">`;

    // Coluna 2: Quantidade (Qtd)
    const qtdCell = novaLinha.insertCell();
    qtdCell.innerHTML = `<input type="number" min="1" class="input-item-qtd" value="${itemData.qtd || 1}">`;

    // Coluna 3: Preço Unitário (PrecoUn)
    const precoUnCell = novaLinha.insertCell();
    precoUnCell.innerHTML = `<input type="number" step="0.01" min="0" class="input-item-preco-un" value="${itemData.precoUn || 0}">`;

    // Coluna 4: Total R$ (Calculado)
    const totalCell = novaLinha.insertCell();
    totalCell.classList.add('item-total-linha');
    const totalLinhaInicial = (itemData.qtd || 1) * (itemData.precoUn || 0);
    totalCell.textContent = `R$ ${totalLinhaInicial.toFixed(2).replace('.', ',')}`;

    // Coluna 5: Ação (Remover)
    const acaoCell = novaLinha.insertCell();
    acaoCell.innerHTML = `<button type="button" class="btn-remover-item" onclick="removerItem(this)">X</button>`;

    // Adiciona listeners para recalcular quando os inputs mudarem
    const inputs = novaLinha.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', recalcularTotais);
    });

}

function removerItem(button) {
    const linha = button.closest('tr');
    if (linha) {
        linha.remove();
        recalcularTotais();
    }
}

function coletarItens() {
    const linhas = document.querySelectorAll('#corpoTabelaItens tr');
    const itens = [];

    linhas.forEach(linha => {
        const nomeInput = linha.querySelector('.input-item-nome');
        const qtdInput = linha.querySelector('.input-item-qtd');
        const precoUnInput = linha.querySelector('.input-item-preco-un');
        
        const nome = nomeInput?.value.trim();
        const qtd = parseInt(qtdInput?.value) || 0;
        const precoUn = parseFloat(precoUnInput?.value || 0) || 0;

        if (nome && qtd > 0 && precoUn >= 0) {
            itens.push({ nome, qtd, precoUn, totalLinha: qtd * precoUn }); 
        }
    });

    return itens;
}

function recalcularTotais() {
    const linhasItens = document.querySelectorAll('#corpoTabelaItens tr');
    let totalGeralItens = 0;
    let totalGeralValor = 0;

    linhasItens.forEach(linha => {
        const qtdInput = linha.querySelector('.input-item-qtd');
        const precoUnInput = linha.querySelector('.input-item-preco-un');
        const totalLinhaCell = linha.querySelector('.item-total-linha');

        const qtd = parseInt(qtdInput?.value || 0) || 0;
        const precoUn = parseFloat(precoUnInput?.value || 0) || 0;

        const totalLinha = qtd * precoUn;

        // Atualiza a célula de total da linha
        if (totalLinhaCell) {
            totalLinhaCell.textContent = `R$ ${totalLinha.toFixed(2).replace('.', ',')}`;
        }
        
        totalGeralItens += qtd;
        totalGeralValor += totalLinha;
    });

    // Atualiza o input de Valor Total do Pedido
    const inputValorTotal = document.getElementById('inputValorTotal');
    if (inputValorTotal) {
        // Garante que o input Valor Total sempre reflita a soma dos itens
        inputValorTotal.value = totalGeralValor.toFixed(2);
    }

    // Atualiza o resumo de total de itens
    const totalItensBadge = document.getElementById('totalItensBadge');
    if (totalItensBadge) {
        totalItensBadge.textContent = totalGeralItens;
    }
    
}


// --- LÓGICA DE EDIÇÃO/CRIAÇÃO (novo-pedido.html) ---

function carregarDadosParaEdicao() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');
    const form = document.getElementById('formNovoPedido');

    if (!form) return; 

    // --- MODO NOVO PEDIDO ---
    if (!pedidoId) {
        document.querySelector('h1').textContent = 'Novo Pedido';
        document.querySelector('button[type="submit"]').textContent = 'Salvar Pedido';
        
        const inputValorTotal = document.getElementById('inputValorTotal');
        if (inputValorTotal) inputValorTotal.value = '0.00';
        
        const corpoTabelaItens = document.getElementById('corpoTabelaItens');
        if (corpoTabelaItens && corpoTabelaItens.children.length === 0) {
            adicionarItem(); // Adiciona 1 linha inicial para Itens
        }
        
        recalcularTotais();
        return;
    }

    // --- MODO EDIÇÃO ---
    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    const pedidoParaEditar = pedidos.find(p => p.id === parseInt(pedidoId));

    if (pedidoParaEditar) {
        
        // Adiciona o campo oculto para o ID (necessário para o salvarPedido)
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'pedidoId';
        idInput.value = pedidoId;
        form.appendChild(idInput);
        
        document.querySelector('h1').textContent = 'Editar Pedido';
        document.querySelector('button[type="submit"]').textContent = 'Atualizar Pedido';

        // Preenche campos principais
        document.getElementById('inputNomeCliente').value = pedidoParaEditar.nomeCliente || '';
        document.getElementById('inputContato').value = pedidoParaEditar.contato || '';
        document.getElementById('inputNumeroPedido').value = pedidoParaEditar.numeroPedido || ''; 
        document.getElementById('inputValorSinal').value = parseFloat(pedidoParaEditar.valorSinal || 0).toFixed(2); 
        
        document.getElementById('inputValorTotal').value = parseFloat(pedidoParaEditar.valorTotal || 0).toFixed(2);
        
        document.getElementById('inputFormaPagamento').value = pedidoParaEditar.formaPagamento || 'Pendente';
        document.getElementById('inputDataEntrega').value = pedidoParaEditar.dataEntrega || '';
        
        // Preenche o campo de texto de Detalhes de Tamanho/Produção
        const inputDetalhesTamanho = document.getElementById('inputDetalhesTamanho');
        if (inputDetalhesTamanho) {
             inputDetalhesTamanho.value = pedidoParaEditar.detalhesTamanho || ''; 
        }

        // Preenche TABELA DE ITENS
        const corpoTabelaItens = document.getElementById('corpoTabelaItens');
        if (corpoTabelaItens) {
            corpoTabelaItens.innerHTML = '';
            if (pedidoParaEditar.itens && Array.isArray(pedidoParaEditar.itens) && pedidoParaEditar.itens.length > 0) {
                pedidoParaEditar.itens.forEach(item => adicionarItem(item));
            } else {
                adicionarItem();
            }
        }
        
        recalcularTotais();
        
    } else {
        alert('Pedido não encontrado para edição.');
        // Redireciona para um novo pedido se o ID for inválido
        window.location.href = 'novo-pedido.html'; 
    }
}

function salvarPedido(event) {
    event.preventDefault();

    const idInput = document.getElementById('pedidoId'); 
    
    // Validação de dados e coleta do array de itens
    const itensColetados = coletarItens();

    if (!document.getElementById('inputNomeCliente').value.trim() || !document.getElementById('inputDataEntrega').value || itensColetados.length === 0) {
         alert('Por favor, preencha Nome do Cliente, Data de Entrega e adicione pelo menos um Item válido.');
         return;
    }
    
    // O Valor Total deve vir da soma dos itens, garantindo que é o valor mais atualizado
    const valorTotalCalculado = itensColetados.reduce((total, item) => total + item.totalLinha, 0);
    
    const dadosPedido = {
        nomeCliente: document.getElementById('inputNomeCliente').value.trim(),
        contato: document.getElementById('inputContato').value.trim(),
        numeroPedido: document.getElementById('inputNumeroPedido').value.trim(),
        formaPagamento: document.getElementById('inputFormaPagamento').value,
        dataEntrega: document.getElementById('inputDataEntrega').value,
        itens: itensColetados, 
        
        detalhesTamanho: document.getElementById('inputDetalhesTamanho')?.value.trim() || '', 
        
        valorSinal: parseFloat(document.getElementById('inputValorSinal').value) || 0,
        // Usa o valor calculado da soma dos itens, garantindo a integridade dos dados
        valorTotal: valorTotalCalculado,
    };

    let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    
    // Lógica para EDIÇÃO
    if (idInput && idInput.value) {
        const pedidoId = parseInt(idInput.value);
        const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
        if (pedidoIndex !== -1) {
            // Mantém o ID, o status e a data de criação originais, atualiza o resto
            pedidos[pedidoIndex] = { ...pedidos[pedidoIndex], ...dadosPedido };
            alert("Pedido atualizado com sucesso!");
        }
    } else { // Lógica para NOVO PEDIDO
        const novoPedido = { 
            id: gerarId(), 
            status: "A Fazer", 
            dataCriacao: Date.now(), // Adiciona a data de criação
            ...dadosPedido 
        };
        pedidos.push(novoPedido);
        alert('Novo pedido salvo com sucesso!');
    }

    localStorage.setItem('pedidos_loja', JSON.stringify(pedidos));
    window.location.href = 'index.html';
}


// --- Lógica para a página de Ordem de Serviço (os.html) ---
function inicializarOS() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');
    const osCard = document.getElementById('osDetalhesCard'); 
    
    if (!pedidoId || !osCard) return;

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    const pedido = pedidos.find(p => p.id === parseInt(pedidoId));

    if (!pedido) {
        osCard.innerHTML = `<p class="erro-os">Ordem de Serviço N° ${pedidoId} não encontrada.</p>`;
        return;
    }

    // Preparar dados formatados
    const valorTotal = pedido.valorTotal || 0;
    const valorSinal = pedido.valorSinal || 0;
    const valorRestante = valorTotal - valorSinal;
    
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const valorTotalFormatado = formatter.format(valorTotal);
    const valorSinalFormatado = formatter.format(valorSinal);
    // --- NOVO FORMATO PARA VALOR RESTANTE (USADO NO OS.HTML) ---
    const valorRestanteFormatado = formatter.format(valorRestante); 
    
    // Tenta usar a dataCriacao salva ou o ID para a data de emissão
    const dataEmissao = (new Date(pedido.dataCriacao || pedido.id)).toLocaleDateString('pt-BR'); 
    
    const numeroOS = pedido.numeroPedido || pedido.id;
    const statusClass = `os-status os-status-${(pedido.status || 'a fazer').toLowerCase().replace(/\s/g, '')}`; 

    // --- Preenche os dados nos elementos do os.html ---

    document.title = `OS N° ${numeroOS}`;
    document.getElementById('osTitulo').textContent = `ORDEM DE SERVIÇO N° ${numeroOS}`;
    
    document.getElementById('osCliente').textContent = pedido.nomeCliente;
    
    // Adicionar link do WhatsApp, se necessário
    const contatoSpan = document.getElementById('osContato');
    contatoSpan.innerHTML = `${pedido.contato} (<a href="https://wa.me/55${(pedido.contato || '').replace(/\D/g, '')}" target="_blank" class="link-whatsapp">Abrir Chat</a>)`;
    
    document.getElementById('osNumPedido').textContent = numeroOS;
    
    // Preencher o Status com a classe de cor
    const statusSpan = document.getElementById('osStatus');
    statusSpan.textContent = pedido.status;
    statusSpan.className = statusClass;

    // Descrição do Serviço (primeiro item)
    document.getElementById('osDescricaoServico').textContent = 
        pedido.itens && pedido.itens.length > 0 ? pedido.itens[0].nome : 'N/A';
        
    // Detalhes de Produção/Tamanho
    document.getElementById('osDetalhesProducao').textContent = pedido.detalhesTamanho || "Não especificado";
    
    // Data de Emissão e Entrega
    document.getElementById('osDataEmissao').textContent = dataEmissao; 
    document.getElementById('osDataEntrega').textContent = pedido.dataEntrega;
    
    // Resumo Financeiro
    document.getElementById('osValorTotal').textContent = valorTotalFormatado;
    document.getElementById('osValorSinal').textContent = valorSinalFormatado;
    // --- NOVO ID para Valor Restante ---
    const osValorRestante = document.getElementById('osValorRestante');
    if (osValorRestante) {
        osValorRestante.textContent = valorRestanteFormatado;
    }
    document.getElementById('osFormaPagamento').textContent = pedido.formaPagamento;
    
    // Anotações (usando detalhesTamanho como anotação de produção)
    const anotacoesTextarea = document.getElementById('osAnotacoes');
    if (anotacoesTextarea) {
        anotacoesTextarea.value = pedido.detalhesTamanho || "Nenhuma anotação de produção.";
    }

    // 4. Preencher a tabela de itens
    const tabelaBody = document.querySelector('#osTabelaItens tbody');
    tabelaBody.innerHTML = ''; // Limpa a tabela
    
    if (pedido.itens && pedido.itens.length > 0) {
        pedido.itens.forEach(item => {
            const linha = tabelaBody.insertRow();
            const totalLinhaFormatado = formatter.format(item.totalLinha || (item.qtd * item.precoUn));
            const precoUnFormatado = formatter.format(item.precoUn || 0);

            linha.insertCell().textContent = item.nome;
            linha.insertCell().textContent = item.qtd; 
            linha.insertCell().textContent = precoUnFormatado;
            linha.insertCell().textContent = totalLinhaFormatado;
        });
    } else {
        const linha = tabelaBody.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 4;
        celula.textContent = 'Nenhum item detalhado neste pedido.';
        celula.style.textAlign = 'center';
    }
    
    // 5. Configurar Botão de Edição
    const btnEditarPedido = document.getElementById('btnEditarPedido');
    if (btnEditarPedido) {
        // --- ALTERAÇÃO AQUI: TROCANDO O HREF PELO ONCLICK ---
        btnEditarPedido.onclick = function() {
            window.location.href = `novo-pedido.html?id=${pedido.id}`;
        };
        // --------------------------------------------------
    }
}


// --- INICIALIZAÇÃO GERAL AO CARREGAR O DOM ---
document.addEventListener('DOMContentLoaded', () => {
    
    const formNovoPedido = document.getElementById('formNovoPedido');
    
    if (formNovoPedido) {
        
        // Inicialização dos Listeners dos Botões de Adicionar
        const btnAddItem = document.getElementById('btnAddItem');
        if (btnAddItem) {
            btnAddItem.addEventListener('click', () => adicionarItem()); 
        }

        // Carrega dados de edição ou inicia novo pedido (e adiciona listeners de input)
        carregarDadosParaEdicao();
        
        // Listener de submissão do formulário
        formNovoPedido.addEventListener('submit', salvarPedido);
        
        // Listener para recalcular Totais quando Valor Sinal mudar
        const inputValorSinal = document.getElementById('inputValorSinal');
        if (inputValorSinal) {
            inputValorSinal.addEventListener('input', recalcularTotais);
        }
    }

    function carregarOrdemDeServico() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');
    const osContainer = document.getElementById('os-container');
    
    // Busca o botão de edição que está no seu HTML fixo
    const btnEditar = document.getElementById('btnEditarPedido'); 
    
    if (!pedidoId || !osContainer) return;

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    const pedido = pedidos.find(p => p.id === parseInt(pedidoId));

    if (pedido) {
        // Formata o valor
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorTotal);
        const dataPedido = new Date(pedido.id).toLocaleDateString('pt-BR'); // Data de criação (baseada no ID/timestamp)

        // 1. INJETA O CONTEÚDO (REMOVENDO OS BOTÕES DUPLICADOS DO FINAL)
        osContainer.innerHTML = `
            <div class="os-header">
                <h2>ORDEM DE SERVIÇO N° ${pedido.id}</h2>
                <p>Data de Emissão: <strong>${dataPedido}</strong></p>
            </div>

            <div class="os-cliente">
                <h3>Dados do Cliente</h3>
                <p>Nome: <strong>${pedido.nomeCliente}</strong></p>
                <p>Contato: <strong>${pedido.contato}</strong></p>
                <p>Status: <span class="os-status os-status-${pedido.status.replace(/\s/g, '').toLowerCase()}">
                    ${pedido.status}
                </span></p>
            </div>
            
            <div class="os-producao">
                <h3>Detalhes do Serviço/Produção</h3>
                
                <div class="campo-os">
                    <h4>Descrição do Serviço:</h4>
                    <p class="detalhe-grande">${pedido.descricaoServico}</p>
                </div>
                
                <div class="campo-os">
                    <h4>Detalhes de Tamanho / Quantidade (Produção):</h4>
                    <p class="detalheTamanho">${pedido.detalhesTamanho || 'N/A'}</p>
                </div>
                
                <div class="os-info-grid">
                    <div>
                        <h4>Data de Entrega:</h4>
                        <p>${pedido.dataEntrega}</p>
                    </div>
                    <div>
                        <h4>Forma de Pagamento:</h4>
                        <p>${pedido.formaPagamento}</p>
                    </div>
                    <div>
                        <h4>Valor Total:</h4>
                        <p class="valor-total-os">${valorFormatado}</p>
                    </div>
                </div>
            </div>

            <div class="os-notas">
                <h4>Anotações de Produção/Qualidade:</h4>
                <div class="espaco-notas"></div>
            </div>
        `;
        
        // 2. ATUALIZA O BOTÃO DE EDIÇÃO (que agora está fixo no HTML)
        if (btnEditar) {
             // Define o destino do botão de edição com o ID correto
             btnEditar.onclick = function() {
                 window.location.href = `novo-pedido.html?id=${pedido.id}`;
             };
        }
        
    } else {
        osContainer.innerHTML = `<p>Ordem de Serviço não encontrada.</p>`;
    }
}

    // --- LÓGICA DE INICIALIZAÇÃO DA PÁGINA OS (os.html) ---
    if (document.getElementById('osDetalhesCard')) {
        inicializarOS();
    }
    else if (document.getElementById('os-container')) { // Para os.html
    carregarOrdemDeServico();
    }
    
    // --- LÓGICA DE INICIALIZAÇÃO DA PÁGINA DASHBOARD (index.html) ---
    if (document.querySelector('#tabelaPedidos')) {
        carregarPedidos();
    }
    
    // --- LÓGICA DE INICIALIZAÇÃO DA PÁGINA HISTÓRICO (historico.html) ---
    if (document.querySelector('#tabelaHistorico')) {
        buscarHistorico(); 
        const inputBusca = document.getElementById('inputBuscaCliente');
        if (inputBusca) {
            // Limpa o campo de busca ao carregar a página
            inputBusca.value = ''; 
            // Adiciona o listener de busca dinâmica
            inputBusca.addEventListener('input', buscarHistorico);
        }
    }
    
});