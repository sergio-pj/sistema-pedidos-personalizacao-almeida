// --- Funções de Utilitário ---

// Função para gerar um ID único (simplesmente pega o timestamp atual)
function gerarId() {
    return Date.now();
}

// Função para calcular e exibir o resumo financeiro
function calcularResumoFinanceiro(pedidos) {
    const faturamentoTotalElement = document.getElementById('faturamentoTotal');
    const valorFaturadoElement = document.getElementById('valorFaturado');
    const totalPendentesElement = document.getElementById('contagemPendentes'); 

    if (!faturamentoTotalElement || !valorFaturadoElement || !totalPendentesElement) {
        return;
    }
    
    // 1. Cálculo do Faturamento Total (Todos os pedidos)
    const totalGeral = pedidos.reduce((acc, pedido) => acc + pedido.valorTotal, 0);

    // 2. Cálculo do Valor Faturado (Apenas pedidos 'Entregue')
    const pedidosEntregues = pedidos.filter(p => p.status === 'Entregue');
    const totalFaturado = pedidosEntregues.reduce((acc, pedido) => acc + pedido.valorTotal, 0);
    
    // 3. Contagem de Pedidos Pendentes
    const pedidosPendentes = pedidos.filter(p => p.status !== 'Entregue');

    // Formatação em Real (BRL)
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    // Exibe os resultados
    faturamentoTotalElement.textContent = formatter.format(totalGeral);
    valorFaturadoElement.textContent = formatter.format(totalFaturado);
    totalPendentesElement.textContent = pedidosPendentes.length; // Exibe a contagem
}


// --- FUNÇÃO PARA O DASHBOARD (index.html) ---
function carregarPedidos() {
    const tabelaBody = document.querySelector('#tabelaPedidos tbody');

    if (!tabelaBody) {
        return; 
    }

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    tabelaBody.innerHTML = ''; 
    
    // CHAVE AQUI: Filtra apenas os pedidos que AINDA NÃO FORAM ENTREGUES
    const pedidosPendentes = pedidos.filter(pedido => pedido.status !== 'Entregue');

    // ORDENAR: Os mais atrasados ou próximos da data de entrega primeiro
    pedidosPendentes.sort((a, b) => new Date(a.dataEntrega) - new Date(b.dataEntrega));

    // ATUALIZA O RESUMO FINANCEIRO
    calcularResumoFinanceiro(pedidos);

    if (pedidosPendentes.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="6">Todos os pedidos foram entregues.</td></tr>';
        return;
    }

    // Exibe os pedidos
    pedidosPendentes.forEach(pedido => {
        const linha = tabelaBody.insertRow();
        
        linha.insertCell().textContent = pedido.status; 
        linha.insertCell().textContent = pedido.dataEntrega; 
        linha.insertCell().textContent = pedido.nomeCliente;

        const servicoCell = linha.insertCell();
        servicoCell.innerHTML = `
            ${pedido.descricaoServico}<br>
            <a href="https://wa.me/55${pedido.contato.replace(/\D/g, '')}" target="_blank" class="link-whatsapp">
                (Contato: ${pedido.contato})
            </a>
        `;

        linha.insertCell().textContent = `R$ ${parseFloat(pedido.valorTotal).toFixed(2)}`;
        
        // CÉLULA DE AÇÕES: Mudança para "Ver OS"
        const acoesCell = linha.insertCell();
        acoesCell.innerHTML = `
            <button class="btn-editar" data-pedido-id="${pedido.id}" onclick="window.location.href='os.html?id=${pedido.id}'">Ver OS</button>
            <button class="btn-acao" data-pedido-id="${pedido.id}" onclick="marcarComoEntregue(event)">Concluir</button>
        `;
        
        // Aplicação de Estilos para Pedidos Atrasados
        if (new Date(pedido.dataEntrega) < new Date()) {
            linha.classList.add('pedido-atrasado');
        }
    });
}


// --- FUNÇÃO PARA O HISTÓRICO DE CLIENTES (historico.html) ---

// --- FUNÇÃO PARA O HISTÓRICO DE CLIENTES (historico.html) ---

function buscarHistorico() {
    const inputBusca = document.getElementById('inputBuscaCliente');
    
    // LINHA CORRIGIDA: usa 'inputBusca?' em vez de 'inputBusBusca?'
    const nomeBusca = inputBusca?.value.trim().toLowerCase() || ""; 

    const tabelaBody = document.querySelector('#tabelaHistorico tbody');
    const relatorioContainer = document.getElementById('relatorioCliente'); 
    
    if (!tabelaBody) {
        return; 
    }

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    tabelaBody.innerHTML = ''; 
    
    // O relatorioContainer existe, vamos limpar ele.
    if (relatorioContainer) {
        relatorioContainer.innerHTML = ''; // Limpa o relatório a cada nova busca
    }


    // Filtra os pedidos: A busca só ocorre se houver um nome, senão lista TODOS (incluindo entregues).
    const pedidosFiltrados = pedidos.filter(pedido => 
        nomeBusca === "" || pedido.nomeCliente.toLowerCase().includes(nomeBusca)
    );

    // Ordenar por data de entrega (do mais novo para o mais antigo no histórico)
    pedidosFiltrados.sort((a, b) => new Date(b.dataEntrega) - new Date(a.dataEntrega));

    // --- LÓGICA DO RELATÓRIO MENSAL (SÓ RODA SE HOUVER BUSCA) ---
    if (nomeBusca !== "" && pedidosFiltrados.length > 0 && relatorioContainer) {
        const relatorio = calcularRelatorioMensal(pedidosFiltrados, nomeBusca);
        relatorioContainer.innerHTML = relatorio;
    }
    // --- FIM LÓGICA DO RELATÓRIO ---
    
    // Colspan corrigido para 6 colunas, conforme o HTML ajustado
    if (pedidosFiltrados.length === 0) {
        if (pedidos.length === 0) {
            tabelaBody.innerHTML = '<tr><td colspan="6">Nenhum pedido cadastrado no sistema.</td></tr>';
        } else {
            tabelaBody.innerHTML = '<tr><td colspan="6">Nenhum pedido encontrado para o cliente pesquisado.</td></tr>';
        }
        return;
    }

    // Exibe os pedidos encontrados na tabela (Resto da lógica da função anterior)
    pedidosFiltrados.forEach(pedido => {
        const linha = tabelaBody.insertRow();
        
        linha.insertCell().textContent = pedido.status; 
        linha.insertCell().textContent = pedido.dataEntrega; 
        linha.insertCell().textContent = pedido.nomeCliente;

        const servicoCell = linha.insertCell();
        servicoCell.innerHTML = `
            ${pedido.descricaoServico}<br>
            <a href="https://wa.me/55${pedido.contato.replace(/\D/g, '')}" target="_blank" class="link-whatsapp">
                (Contato: ${pedido.contato})
            </a>
        `;

        linha.insertCell().textContent = `R$ ${parseFloat(pedido.valorTotal).toFixed(2)}`;
        
        // CÉLULA DE AÇÕES: BOTOES DE EXCLUIR E MARCAR COMO CONCLUÍDO / REABRIR
        const acoesCell = linha.insertCell();
        
        // SE o pedido estiver 'Entregue', mostra o botão REABRIR.
        if (pedido.status === 'Entregue') {
            acoesCell.innerHTML = `
                <button class="btn-editar" data-pedido-id="${pedido.id}" onclick="window.location.href='os.html?id=${pedido.id}'">Ver OS</button>
                <button class="btn-acao btn-reabrir" data-pedido-id="${pedido.id}" onclick="reabrirPedido(event)">Reabrir</button>
                <button class="btn-excluir" data-pedido-id="${pedido.id}" onclick="excluirPedido(event)">Excluir</button>
            `;
        } else {
            // Se NÃO estiver entregue, mostra o botão Concluir (como antes).
            acoesCell.innerHTML = `
                <button class="btn-editar" data-pedido-id="${pedido.id}" onclick="window.location.href='os.html?id=${pedido.id}'">Ver OS</button>
                <button class="btn-acao" data-pedido-id="${pedido.id}" onclick="marcarComoEntregue(event)">Concluir</button>
                <button class="btn-excluir" data-pedido-id="${pedido.id}" onclick="excluirPedido(event)">Excluir</button>
            `;
        }

        // APLICAÇÃO DAS CLASSES DE DESTAQUE PARA SOFISTICAÇÃO VISUAL
        if (pedido.status === 'Entregue') {
            linha.classList.add('pedido-entregue');
        } else if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
}


// --- NOVA FUNÇÃO: CALCULA O RELATÓRIO MENSAL ---
function calcularRelatorioMensal(pedidosDoCliente, nomeCliente) {
    // 1. Agrupa os pedidos por Mês/Ano
    const resumoPorMes = pedidosDoCliente.reduce((acc, pedido) => {
        const data = new Date(pedido.dataEntrega + 'T00:00:00'); 
        
        const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
        
        if (!acc[mesAno]) {
            acc[mesAno] = {
                totalPedidos: 0,
                faturamentoTotal: 0
            };
        }
        
        acc[mesAno].totalPedidos += 1;
        acc[mesAno].faturamentoTotal += pedido.valorTotal;
        
        return acc;
    }, {});
    
    // 2. Formata e monta o HTML
    let htmlRelatorio = `
        <div class="relatorio-card">
            <h2>Relatório Mensal de Pedidos para: ${nomeCliente.toUpperCase()}</h2>
            <div class="resumo-grid">
    `;

    const meses = Object.keys(resumoPorMes).sort().reverse(); 
    
    if (meses.length === 0) {
        htmlRelatorio += '<p>Nenhum pedido encontrado para este cliente.</p>';
    } else {
        meses.forEach(mesAno => {
            const dados = resumoPorMes[mesAno];
            const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.faturamentoTotal);
            
            htmlRelatorio += `
                <div class="mes-item">
                    <h3>Mês/Ano: ${mesAno}</h3>
                    <p>Total de Pedidos: <span>${dados.totalPedidos}</span></p>
                    <p>Faturamento: <span class="valor-relatorio">${valorFormatado}</span></p>
                </div>
            `;
        });
    }

    htmlRelatorio += `
            </div>
        </div>
    `;
    
    return htmlRelatorio;
}

// Função para alterar o status de um pedido para "Entregue"
function marcarComoEntregue(event) {
    const pedidoId = parseInt(event.target.dataset.pedidoId); 
    
    let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    
    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
    
    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex].status = "Entregue";
        localStorage.setItem('pedidos_loja', JSON.stringify(pedidos));
        
        // Chama a função correta dependendo da página
        if (document.querySelector('#tabelaPedidos')) {
            carregarPedidos();
        } else if (document.querySelector('#tabelaHistorico')) {
            buscarHistorico(); 
        }
    } else {
        alert("Erro: Pedido não encontrado.");
    }
}


// --- NOVA FUNÇÃO: REABRIR PEDIDO ---
function reabrirPedido(event) {
    const pedidoId = parseInt(event.target.dataset.pedidoId); 
    
    let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    
    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
    
    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex].status = "A Fazer";
        localStorage.setItem('pedidos_loja', JSON.stringify(pedidos));
        
        // Recarrega o histórico para atualizar a lista
        alert("Pedido reaberto com sucesso. Ele voltou para o Dashboard.");
        buscarHistorico(); 
        
    } else {
        alert("Erro: Pedido não encontrado.");
    }
}

// Função para excluir um pedido
function excluirPedido(event) {
    const pedidoId = parseInt(event.target.dataset.pedidoId);

    const confirmacao = confirm("Tem certeza de que deseja excluir este pedido? Esta ação não pode ser desfeita.");

    if (confirmacao) {
        let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];

        const novosPedidos = pedidos.filter(p => p.id !== pedidoId);

        localStorage.setItem('pedidos_loja', JSON.stringify(novosPedidos));
        // Chama a função correta dependendo da página
        if (document.querySelector('#tabelaPedidos')) {
            carregarPedidos();
        } else if (document.querySelector('#tabelaHistorico')) {
            buscarHistorico(); 
        }
    }
}

// --- LÓGICA DE EDIÇÃO (Executada na página novo-pedido.html) ---

// Função que roda quando a página do formulário carrega
function carregarDadosParaEdicao() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');

    // Só prossegue se o formulário existir na página
    const form = document.getElementById('formNovoPedido');
    if (!form) return; 

    // Se não houver ID na URL, não faz nada (é um novo pedido)
    if (!pedidoId) {
        return;
    }

    // Se houver um ID, estamos em modo de edição
    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    const pedidoParaEditar = pedidos.find(p => p.id === parseInt(pedidoId));

    if (pedidoParaEditar) {
        // Preenche o formulário com os dados existentes
        document.getElementById('inputNomeCliente').value = pedidoParaEditar.nomeCliente || '';
        document.getElementById('inputContato').value = pedidoParaEditar.contato || '';
        document.getElementById('inputDescricao').value = pedidoParaEditar.descricaoServico || '';
        
        // PREENCHIMENTO DO NOVO CAMPO DE DETALHES DE TAMANHO
        document.getElementById('inputDetalhesTamanho').value = pedidoParaEditar.detalhesTamanho || ''; 
        
        document.getElementById('inputValorTotal').value = pedidoParaEditar.valorTotal || 0;
        document.getElementById('inputFormaPagamento').value = pedidoParaEditar.formaPagamento || '';
        document.getElementById('inputDataEntrega').value = pedidoParaEditar.dataEntrega || '';
        
        // Adiciona um campo oculto para guardar o ID
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'pedidoId';
        idInput.value = pedidoId;
        form.appendChild(idInput);

        // Muda o título e o texto do botão
        const h1 = document.querySelector('h1');
        if (h1) h1.textContent = 'Editar Pedido';
        
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Atualizar Pedido';
    }
}


// --- Lógica Principal de Salvamento (novo-pedido.html) ---
const form = document.getElementById('formNovoPedido');

if (form) {
    form.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        const idInput = document.getElementById('pedidoId');
        
        // Coleta os dados do formulário
        const dadosPedido = {
            nomeCliente: document.getElementById('inputNomeCliente').value,
            contato: document.getElementById('inputContato').value,
            descricaoServico: document.getElementById('inputDescricao').value,
            detalhesTamanho: document.getElementById('inputDetalhesTamanho').value, // CAMPO INCLUÍDO
            valorTotal: parseFloat(document.getElementById('inputValorTotal').value) || 0,
            formaPagamento: document.getElementById('inputFormaPagamento').value,
            dataEntrega: document.getElementById('inputDataEntrega').value,
        };

        let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];

        if (idInput) {
            // MODO ATUALIZAÇÃO
            const pedidoId = parseInt(idInput.value);
            const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
            if (pedidoIndex !== -1) {
                // Mantém o ID e o status originais, atualiza o resto
                pedidos[pedidoIndex] = { ...pedidos[pedidoIndex], ...dadosPedido };
                alert('Pedido atualizado com sucesso!');
            }
        } else {
            // MODO CRIAÇÃO (novo pedido)
            const objetoNovo = {
                id: gerarId(),
                status: "A Fazer",
                ...dadosPedido
            };
            pedidos.push(objetoNovo);
            alert('Pedido de ' + dadosPedido.nomeCliente + ' salvo com sucesso!');
        }

        // Salva a lista (seja ela atualizada ou com um novo item)
        localStorage.setItem('pedidos_loja', JSON.stringify(pedidos));
        
        // Redireciona de volta para a lista de pedidos
        window.location.href = 'index.html';
    });
    
    // Chama a função de edição apenas se estivermos na página do formulário
    carregarDadosParaEdicao();
}


// --- Lógica para a página de Ordem de Serviço (os.html) ---

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


// --- Chamada da Função de Carregamento ---

// Lógica robusta para carregar a função correta em cada página
if (document.querySelector('#tabelaPedidos')) { // Para index.html
    carregarPedidos();
} else if (document.querySelector('#tabelaHistorico')) { // Para historico.html
    buscarHistorico(); 
} else if (document.getElementById('os-container')) { // Para os.html
    carregarOrdemDeServico();
}