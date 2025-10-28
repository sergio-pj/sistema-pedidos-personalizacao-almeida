// --- Funções de Utilitário ---

// Função para gerar um ID único (simplesmente pega o timestamp atual)
function gerarId() {
    return Date.now();
}

// Função para calcular e exibir o resumo financeiro
function calcularResumoFinanceiro(pedidos) {
    const faturamentoTotalElement = document.getElementById('faturamentoTotal');
    const valorFaturadoElement = document.getElementById('valorFaturado');

    if (!faturamentoTotalElement || !valorFaturadoElement) {
        return;
    }
    
    // 1. Cálculo do Faturamento Total (Todos os pedidos)
    const totalGeral = pedidos.reduce((acc, pedido) => acc + pedido.valorTotal, 0);

    // 2. Cálculo do Valor Faturado (Apenas pedidos 'Entregue')
    const totalFaturado = pedidos
        .filter(p => p.status === 'Entregue')
        .reduce((acc, pedido) => acc + pedido.valorTotal, 0);

    // Formatação em Real (BRL)
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    // Exibe os resultados
    faturamentoTotalElement.textContent = formatter.format(totalGeral);
    valorFaturadoElement.textContent = formatter.format(totalFaturado);
}


// Função para buscar e exibir o histórico de pedidos de um cliente (CORRIGIDA E SOFISTICADA)
function buscarHistorico() {
    // Usamos ?.value para garantir que só tentamos acessar o valor se o elemento existir
    const nomeBusca = document.getElementById('inputBuscaCliente')?.value.trim().toLowerCase() || "";
    const tabelaBody = document.querySelector('#tabelaHistorico tbody');
    
    if (!tabelaBody) {
        return; 
    }

    const pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    tabelaBody.innerHTML = ''; 

    // Filtra os pedidos: Se nomeBusca for vazio, lista todos.
    const pedidosFiltrados = pedidos.filter(pedido => 
        nomeBusca === "" || pedido.nomeCliente.toLowerCase().includes(nomeBusca)
    );

    // Ordenar por data de entrega (apenas para manter organizado)
    pedidosFiltrados.sort((a, b) => new Date(a.dataEntrega) - new Date(b.dataEntrega));

    // Colspan corrigido para 6 colunas, conforme o HTML ajustado
    if (pedidosFiltrados.length === 0) {
        if (pedidos.length === 0) {
             tabelaBody.innerHTML = '<tr><td colspan="6">Nenhum pedido cadastrado no sistema.</td></tr>';
        } else {
             tabelaBody.innerHTML = '<tr><td colspan="6">Nenhum pedido encontrado para o cliente pesquisado.</td></tr>';
        }
        return;
    }

    // Exibe os pedidos encontrados
    pedidosFiltrados.forEach(pedido => {
        const linha = tabelaBody.insertRow();
        
        // 1. Célula Status
        linha.insertCell().textContent = pedido.status; 
        
        // 2. Célula Data de Entrega
        linha.insertCell().textContent = pedido.dataEntrega; 
        
        // 3. Célula Cliente
        linha.insertCell().textContent = pedido.nomeCliente;

        // 4. CÉLULA SERVIÇO/CONTATO COM LINK WHATSAPP
        const servicoCell = linha.insertCell();
        servicoCell.innerHTML = `
            ${pedido.descricaoServico}<br>
            <a href="https://wa.me/55${pedido.contato.replace(/\D/g, '')}" target="_blank" class="link-whatsapp">
                (Contato: ${pedido.contato})
            </a>
        `;

        // 5. Célula Valor
        linha.insertCell().textContent = `R$ ${parseFloat(pedido.valorTotal).toFixed(2)}`;
        
        // 6. CÉLULA DE AÇÕES (Para manter o alinhamento de 6 colunas)
        const acoesCell = linha.insertCell();
        // Não precisamos de botões no histórico, mas podemos adicionar um botão 'Ver'
        acoesCell.textContent = 'Ver histórico'; 
        
        // APLICAÇÃO DAS CLASSES DE DESTAQUE PARA SOFISTICAÇÃO VISUAL
        if (pedido.status === 'Entregue') {
            linha.classList.add('pedido-entregue');
        } else if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
}

// Função para carregar e exibir os pedidos na tabela (para index.html)
function carregarPedidos() {
    const tabelaBody = document.querySelector('#tabelaPedidos tbody');

    if (!tabelaBody) {
        return; // Sai da função se não estiver no index.html
    }

    let pedidos = JSON.parse(localStorage.getItem('pedidos_loja')) || [];
    tabelaBody.innerHTML = ''; 

    // CHAMA A FUNÇÃO DE RESUMO FINANCEIRO
    calcularResumoFinanceiro(pedidos);
    
    // --- Lógica de Contagem ---
    const contagemPendentes = pedidos.filter(p => p.status === "A Fazer").length;
    const elementoContagem = document.getElementById('contagemPendentes');
    if (elementoContagem) {
        elementoContagem.textContent = contagemPendentes;
    }
    // --- FIM Lógica de Contagem ---

    // --- Lógica de Filtros ---
    const filtroStatus = document.getElementById('filtroStatus');
    const filtroBusca = document.getElementById('filtroBusca');
    const filtroDataEntrega = document.getElementById('filtroDataEntrega');
    
    let pedidosFiltrados = pedidos;

    // Função auxiliar para obter a data de hoje formatada (AAAA-MM-DD)
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        // O mês é base 0, então adicionamos 1
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 1. Filtrar por Status
    if (filtroStatus && filtroStatus.value !== 'todos') {
        pedidosFiltrados = pedidosFiltrados.filter(pedido => 
            pedido.status === filtroStatus.value
        );
    }
    
    // 2. Filtrar por Data de Entrega
    if (filtroDataEntrega && filtroDataEntrega.value === 'hoje') {
        const hoje = getTodayDate();
        pedidosFiltrados = pedidosFiltrados.filter(pedido => 
            pedido.dataEntrega === hoje
        );
    }

    // 3. Filtrar por Busca (Cliente/Serviço)
    if (filtroBusca && filtroBusca.value.trim() !== '') {
        const termo = filtroBusca.value.trim().toLowerCase();
        pedidosFiltrados = pedidosFiltrados.filter(pedido => 
            pedido.nomeCliente.toLowerCase().includes(termo) ||
            pedido.descricaoServico.toLowerCase().includes(termo)
        );
    }
    // --- FIM Lógica de Filtros ---

    // Ordena os pedidos pela data de entrega (os mais urgentes primeiro)
    pedidosFiltrados.sort((a, b) => new Date(a.dataEntrega) - new Date(b.dataEntrega));
    
    // Se não houver pedidos após a filtragem
    if (pedidosFiltrados.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="6">Nenhum pedido encontrado com os filtros aplicados.</td></tr>';
        return;
    }

    // --- Exibir os dados na tabela ---
    pedidosFiltrados.forEach(pedido => {
        const linha = tabelaBody.insertRow();
        
        // Células da Tabela
        linha.insertCell().textContent = pedido.status; 
        linha.insertCell().textContent = pedido.dataEntrega; 
        linha.insertCell().textContent = pedido.nomeCliente;

        // CÉLULA SERVIÇO/CONTATO COM LINK WHATSAPP
        const servicoCell = linha.insertCell();
        servicoCell.innerHTML = `
            ${pedido.descricaoServico}<br>
            <a href="https://wa.me/55${pedido.contato.replace(/\D/g, '')}" target="_blank" class="link-whatsapp">
                (Contato: ${pedido.contato})
            </a>
        `;

        linha.insertCell().textContent = `R$ ${parseFloat(pedido.valorTotal).toFixed(2)}`;
        
        // Célula Ações
        const acoesCell = linha.insertCell();
        
        // Se o pedido NÃO foi entregue, ele recebe os botões Entregue e Editar
        if (pedido.status !== 'Entregue') {
            const btnEntregue = document.createElement('button');
            btnEntregue.textContent = 'Entregue';
            btnEntregue.dataset.pedidoId = pedido.id; 
            btnEntregue.addEventListener('click', marcarComoEntregue);
            acoesCell.appendChild(btnEntregue);

            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.className = 'btn-editar';
            btnEditar.addEventListener('click', () => {
                window.location.href = `novo-pedido.html?id=${pedido.id}`;
            });
            acoesCell.appendChild(btnEditar);
        } else {
            // Se o pedido FOI entregue, ele recebe o texto 'Concluído'
            acoesCell.textContent = 'Concluído';
        }
        
        // ADICIONAMOS A LÓGICA DO BOTÃO EXCLUIR PARA TODOS (Entregues ou Não)
        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = 'Excluir';
        btnExcluir.className = 'btn-excluir';
        btnExcluir.dataset.pedidoId = pedido.id;
        btnExcluir.addEventListener('click', excluirPedido);
        acoesCell.appendChild(btnExcluir);
        
        // Opcional: Adicionar classe para destaque visual (via CSS)
        if (pedido.status === 'Entregue') {
            linha.classList.add('pedido-entregue');
        } else if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
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
        document.getElementById('inputNomeCliente').value = pedidoParaEditar.nomeCliente;
        document.getElementById('inputContato').value = pedidoParaEditar.contato;
        document.getElementById('inputDescricao').value = pedidoParaEditar.descricaoServico;
        document.getElementById('inputValorTotal').value = pedidoParaEditar.valorTotal;
        document.getElementById('inputFormaPagamento').value = pedidoParaEditar.formaPagamento;
        document.getElementById('inputDataEntrega').value = pedidoParaEditar.dataEntrega;
        
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
        
        // Verifica se há um campo oculto com ID (sinal de que estamos editando)
        const idInput = document.getElementById('pedidoId');
        
        // Coleta os dados do formulário
        const dadosPedido = {
            nomeCliente: document.getElementById('inputNomeCliente').value,
            contato: document.getElementById('inputContato').value,
            descricaoServico: document.getElementById('inputDescricao').value,
            valorTotal: parseFloat(document.getElementById('inputValorTotal').value) || 0,
            formaPagamento: document.getElementById('inputFormaPagamento').value,
            dataEntrega: document.getElementById('inputDataEntrega').value
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


// --- Chamada da Função de Carregamento ---

// Lógica robusta para carregar a função correta em cada página
if (document.querySelector('#tabelaPedidos')) {
    carregarPedidos();
} else if (document.querySelector('#tabelaHistorico')) {
    buscarHistorico(); // Garante que a lista completa carregue na página de Histórico
}