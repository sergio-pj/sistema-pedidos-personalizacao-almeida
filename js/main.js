// Importa a configuração centralizada
const API_URL = window.API_CONFIG ? window.API_CONFIG.getApiUrl() : 'http://localhost:3000/api';

// --- FUNÇÃO DE UTILIDADE ---
function gerarId() {
    // Retorna o timestamp atual (em milissegundos) como ID único.
    return Date.now();
}

// --- Autenticação / helpers ---
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

// Simple toast helper (non-blocking feedback)
function showToast(message, type = 'info', ttl = 4000) {
    try {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, ttl);
    } catch (e) {
        // fallback para alert quando DOM indisponível
        try { alert(message); } catch (err) { console.warn('Toast falhou e alert também:', err); }
    }
}

// Helpers para isolar o storage por admin: pedidos_loja_<adminId>
function getPedidosKey() {
    const adminData = JSON.parse(localStorage.getItem('adminData') || 'null');
    if (adminData && adminData._id) return `pedidos_loja_${adminData._id}`;
    return 'pedidos_loja';
}

function readLocalPedidos() {
    try {
        return JSON.parse(localStorage.getItem(getPedidosKey()) || '[]');
    } catch (e) {
        console.warn('Erro ao ler pedidos locais:', e);
        return [];
    }
}

function writeLocalPedidos(pedidos) {
    try {
        localStorage.setItem(getPedidosKey(), JSON.stringify(pedidos || []));
    } catch (e) {
        console.warn('Erro ao gravar pedidos locais:', e);
    }
}

function removeLocalPedidosKey() {
    try { localStorage.removeItem(getPedidosKey()); } catch (e) { /* ignore */ }
}

// Sincroniza pedidos pendentes para um admin (usa key `pedidos_loja_<adminId>`).
// Retorna um objeto com stats: { syncedCount, failedCount }
async function syncPendingPedidos(token = null, adminId = null) {
    try {
        if (!token) token = localStorage.getItem('adminToken');
        if (!adminId) {
            const adminData = JSON.parse(localStorage.getItem('adminData') || 'null');
            adminId = adminData && adminData._id;
        }
        if (!token || !adminId) return { syncedCount: 0, failedCount: 0 };

        const pedidosKey = `pedidos_loja_${adminId}`;
        const locais = JSON.parse(localStorage.getItem(pedidosKey) || '[]');
        const pendentes = locais.filter(p => p.pendenteSincronizacao || !p.serverId);
        const wait = (ms) => new Promise(res => setTimeout(res, ms));
        let syncedCount = 0, failedCount = 0;

        for (const p of pendentes) {
            let synced = false;
            for (let attempt = 1; attempt <= 3 && !synced; attempt++) {
                try {
                    // check existing by legacyId
                    const respCheck = await fetch(`${API_URL}/pedidos`, { headers: { 'Authorization': 'Bearer ' + token } });
                    if (respCheck.ok) {
                        const serverList = await respCheck.json();
                        const found = serverList.find(s => String(s.legacyId) === String(p.id) || String(s.legacyId) === String(p.legacyId));
                        if (found) {
                            const armazenados = JSON.parse(localStorage.getItem(pedidosKey) || '[]');
                            const idx = armazenados.findIndex(x => String(x.id) === String(p.id) || String(x.legacyId) === String(p.legacyId));
                            if (idx !== -1) {
                                armazenados[idx].serverId = found._id;
                                armazenados[idx].pendenteSincronizacao = false;
                                localStorage.setItem(pedidosKey, JSON.stringify(armazenados));
                            }
                            synced = true; syncedCount++; break;
                        }
                    }

                    // try create
                    const headersSync = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
                    const body = { legacyId: p.id, ...p, dataCriacao: p.dataCriacao || p.id };
                    const respSync = await fetch(`${API_URL}/pedidos`, { method: 'POST', headers: headersSync, body: JSON.stringify(body) });
                    if (respSync.ok) {
                        const criado = await respSync.json();
                        const armazenados = JSON.parse(localStorage.getItem(pedidosKey) || '[]');
                        const idx = armazenados.findIndex(x => String(x.id) === String(p.id) || String(x.legacyId) === String(p.legacyId));
                        if (idx !== -1) {
                            armazenados[idx].serverId = criado._id;
                            armazenados[idx].pendenteSincronizacao = false;
                            localStorage.setItem(pedidosKey, JSON.stringify(armazenados));
                        }
                        synced = true; syncedCount++; break;
                    } else {
                        const backoff = 500 * Math.pow(2, attempt - 1); await wait(backoff);
                    }
                } catch (e) {
                    const backoff = 500 * Math.pow(2, attempt - 1); await wait(backoff);
                }
            }
            if (!synced) {
                failedCount++;
                const armazenados = JSON.parse(localStorage.getItem(pedidosKey) || '[]');
                const idx = armazenados.findIndex(x => String(x.id) === String(p.id) || String(x.legacyId) === String(p.legacyId));
                if (idx !== -1) { armazenados[idx].syncError = true; armazenados[idx].pendenteSincronizacao = true; localStorage.setItem(pedidosKey, JSON.stringify(armazenados)); }
            }
        }

        // refresh server list and merge unsynced
        try {
            const respList = await fetch('http://localhost:3000/api/pedidos', { headers: { 'Authorization': 'Bearer ' + token } });
            if (respList.ok) {
                const serverList = await respList.json();
                const locaisNow = JSON.parse(localStorage.getItem(pedidosKey) || '[]');
                const naoSincronizados = locaisNow.filter(l => l.pendenteSincronizacao);
                const merged = serverList.slice(); naoSincronizados.forEach(ns => merged.push(ns));
                localStorage.setItem(pedidosKey, JSON.stringify(merged));
            }
        } catch (e) { /* ignore */ }

        return { syncedCount, failedCount };
    } catch (err) {
        console.warn('syncPendingPedidos error:', err);
        return { syncedCount: 0, failedCount: 0 };
    }
}

// Sincroniza apenas um pedido local (identificado pelo elemento ou id). Retorna { ok: boolean, message }
async function syncSinglePedido(elOrId) {
    try {
        const el = (elOrId && elOrId.target) ? elOrId.target : elOrId;
        const pedidoIdRaw = el?.dataset?.pedidoId || elOrId;
    if (!pedidoIdRaw) { showToast('ID do pedido não fornecido para sincronizar.', 'error'); return { ok: false, message: 'no-id' }; }

        const adminData = JSON.parse(localStorage.getItem('adminData') || 'null');
        const token = localStorage.getItem('adminToken');
    if (!token || !adminData || !adminData._id) { showToast('Você precisa estar logado para sincronizar.', 'error'); return { ok: false, message: 'no-auth' }; }

        const pedidosKey = `pedidos_loja_${adminData._id}`;
        const armazenados = JSON.parse(localStorage.getItem(pedidosKey) || '[]');
        const idx = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
    if (idx === -1) { showToast('Pedido local não encontrado para sincronizar.', 'error'); return { ok: false, message: 'not-found-local' }; }

        const p = armazenados[idx];

        // 1) checa se já existe no servidor
        try {
            const respList = await fetch('http://localhost:3000/api/pedidos', { headers: { 'Authorization': 'Bearer ' + token } });
            if (respList.ok) {
                const serverList = await respList.json();
                const found = serverList.find(s => String(s.legacyId) === String(p.id) || String(s.legacyId) === String(p.legacyId));
                if (found) {
                    armazenados[idx].serverId = found._id;
                    armazenados[idx].pendenteSincronizacao = false;
                    armazenados[idx].syncError = false;
                    localStorage.setItem(pedidosKey, JSON.stringify(armazenados));
                    if (document.querySelector('#tabelaPedidos')) carregarPedidos();
                    if (document.querySelector('#tabelaHistorico')) buscarHistorico();
                            showToast('Pedido já existente no servidor — marcado como sincronizado.', 'info');
                    return { ok: true, message: 'exists' };
                }
            }
        } catch (e) { console.warn('Erro ao checar pedido no servidor:', e); }

        // 2) tenta criar no servidor
        try {
            const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
            const body = { legacyId: p.id, ...p, dataCriacao: p.dataCriacao || p.id };
            const resp = await fetch('http://localhost:3000/api/pedidos', { method: 'POST', headers, body: JSON.stringify(body) });
            if (resp.ok) {
                const criado = await resp.json();
                armazenados[idx].serverId = criado._id;
                armazenados[idx].pendenteSincronizacao = false;
                armazenados[idx].syncError = false;
                localStorage.setItem(pedidosKey, JSON.stringify(armazenados));
                if (document.querySelector('#tabelaPedidos')) carregarPedidos();
                if (document.querySelector('#tabelaHistorico')) buscarHistorico();
                showToast('Pedido sincronizado com sucesso.', 'success');
                return { ok: true, message: 'created' };
            } else {
                const errText = await resp.text();
                armazenados[idx].syncError = true;
                localStorage.setItem(pedidosKey, JSON.stringify(armazenados));
                showToast('Falha ao sincronizar pedido: ' + (errText || resp.status), 'error');
                return { ok: false, message: 'failed', info: errText };
            }
        } catch (e) {
            console.warn('Erro ao sincronizar pedido:', e);
            armazenados[idx].syncError = true;
            localStorage.setItem(pedidosKey, JSON.stringify(armazenados));
            showToast('Erro ao conectar com o servidor ao tentar sincronizar.', 'error');
            return { ok: false, message: 'error', info: e.message };
        }
    } catch (err) {
        console.warn('syncSinglePedido error:', err);
        return { ok: false, message: 'exception' };
    }
}

// --- Pedido helpers ---
function getPedidoIdentifier(pedido) {
    // Prefer server _id, then serverId, then legacyId, then local id
    if (!pedido) return '';
    return pedido._id || pedido.serverId || (pedido.legacyId != null ? String(pedido.legacyId) : (pedido.id != null ? String(pedido.id) : ''));
}

function formatDateForDisplay(value) {
    if (!value) return 'N/A';
    // If value is a number (timestamp) or numeric string, use it
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('pt-BR');
}

function getPedidoDisplayNumber(pedido) {
    if (!pedido) return '';
    if (pedido.legacyId) return pedido.legacyId;
    if (pedido.id && typeof pedido.id === 'number') return pedido.id;
    if (pedido._id) return pedido._id.slice(-6); // show short id
    return '';
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    // também limpa pedidos locais para evitar dados antigos visíveis
    removeLocalPedidosKey();
    // redireciona para tela de login
    window.location.href = 'login.html';
}

function initAuthUI() {
    const authControls = document.getElementById('authControls');
    if (!authControls) return;
    const adminData = JSON.parse(localStorage.getItem('adminData') || 'null');
    authControls.innerHTML = '';
    if (adminData) {
        const nameSpan = document.createElement('span');
        nameSpan.textContent = adminData.nomeLoja || adminData.nome || '';
        nameSpan.style.fontWeight = '600';
        const btn = document.createElement('button');
        btn.textContent = 'Sair';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', logout);
        const syncBtn = document.createElement('button');
        syncBtn.textContent = 'Sincronizar';
        syncBtn.style.cursor = 'pointer';
        syncBtn.style.marginLeft = '8px';
        syncBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            const adminId = adminData._id;
            try {
                const res = await syncPendingPedidos(token, adminId);
                showToast(`Sincronização completa: sincronizados ${res.syncedCount}, falhas ${res.failedCount}`, 'info');
                // atualizar UI
                if (document.querySelector('#tabelaPedidos')) carregarPedidos();
                if (document.querySelector('#tabelaHistorico')) buscarHistorico();
            } catch (e) {
                showToast('Erro ao sincronizar: ' + (e.message || e), 'error');
            }
        });
        authControls.appendChild(nameSpan);
        authControls.appendChild(btn);
        authControls.appendChild(syncBtn);
    } else {
        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.textContent = 'Entrar';
        authControls.appendChild(loginLink);
    }
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
async function carregarPedidos() {
    const tabelaBody = document.querySelector('#tabelaPedidos tbody');

    if (!tabelaBody) return; 

    let pedidos = [];
    let pedidosServidor = [];
    let pedidosLocal = readLocalPedidos();

    // Tenta buscar do servidor
    try {
        const resp = await fetch('http://localhost:3000/api/pedidos', { headers: getAuthHeaders() });
        if (resp.ok) {
            pedidosServidor = await resp.json();
            // Atualiza localStorage com dados do servidor
            writeLocalPedidos(pedidosServidor);
            pedidos = pedidosServidor;
        } else {
            pedidos = pedidosLocal;
        }
    } catch (err) {
        console.error('Erro ao buscar do servidor:', err);
        pedidos = pedidosLocal;
    }

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
    linha.insertCell().textContent = formatDateForDisplay(pedido.dataEntrega); 
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
        const pid = getPedidoIdentifier(pedido);
        let indicador = '';
        if (pedido.pendenteSincronizacao) indicador = '<span class="sync-badge sync-pendente">Pendente</span>';
        else if (pedido.syncError) indicador = '<span class="sync-badge sync-erro">Erro</span>';

        const syncButton = (pedido.pendenteSincronizacao || pedido.syncError) ? `<button class="btn-sync" data-pedido-id="${pid}" onclick="syncSinglePedido(this)">Sincronizar</button>` : '';

        acoesCell.innerHTML = `
            <button class="btn-editar btn-os" data-pedido-id="${pid}" onclick="window.location.href='os.html?id=${pid}'">Ver OS</button>
            <button class="btn-acao" data-pedido-id="${pid}" onclick="marcarComoEntregue(this)">Concluir</button>
            ${syncButton}
            ${indicador}
        `;
        
        // Adiciona classe de atraso se a data de entrega passou
        if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
}


// --- FUNÇÃO PARA O HISTÓRICO DE CLIENTES (historico.html) ---
async function buscarHistorico() {
    // Pega o valor de busca, corrigido para verificar a existência do elemento
    const inputBusca = document.getElementById('inputBuscaCliente'); 
    // Verifica se a página recebeu ?cliente=Nome na URL (quando clicamos em Ver Pedidos)
    const urlParams = new URLSearchParams(window.location.search);
    const clienteParam = urlParams.get('cliente');
    let nomeBusca = clienteParam ? clienteParam.trim().toLowerCase() : (inputBusca?.value.trim().toLowerCase() || "");
    // Se veio por URL, preenche o campo de busca para o usuário
    if (clienteParam && inputBusca) inputBusca.value = clienteParam;
    const tabelaBody = document.querySelector('#tabelaHistorico tbody');

    if (!tabelaBody) return; 

    let pedidos = [];
    try {
        const resp = await fetch('http://localhost:3000/api/pedidos', { headers: getAuthHeaders() });
        if (resp.ok) pedidos = await resp.json();
        else pedidos = readLocalPedidos();
    } catch (err) {
        pedidos = readLocalPedidos();
    }
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
    linha.insertCell().textContent = formatDateForDisplay(pedido.dataEntrega); 
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
        const pid2 = getPedidoIdentifier(pedido);
        let indicador2 = '';
        if (pedido.pendenteSincronizacao) indicador2 = '<span class="sync-badge sync-pendente">Pendente</span>';
        else if (pedido.syncError) indicador2 = '<span class="sync-badge sync-erro">Erro</span>';

        const syncBtn2 = (pedido.pendenteSincronizacao || pedido.syncError) ? `<button class="btn-sync" data-pedido-id="${pid2}" onclick="syncSinglePedido(this)">Sincronizar</button>` : '';

        acoesCell.innerHTML = `
            <button class="btn-editar btn-os" data-pedido-id="${pid2}" onclick="window.location.href='os.html?id=${pid2}'">Ver OS</button>
            ${pedido.status === 'Entregue' ? 
                `<button class="btn-acao btn-reabrir" data-pedido-id="${pid2}" onclick="reabrirPedido(this)">Reabrir</button>` : 
                `<button class="btn-acao" data-pedido-id="${pid2}" onclick="marcarComoEntregue(this)">Concluir</button>`
            }
            ${syncBtn2}
            <button class="btn-excluir" data-pedido-id="${pid2}" onclick="excluirPedido(this)">Excluir</button>
            ${indicador2}
        `;

        // Adiciona classes de status para estilização
        if (pedido.status === 'Entregue') {
            linha.classList.add('pedido-entregue');
        } else if (new Date(pedido.dataEntrega) < new Date() && pedido.status !== 'Entregue') {
            linha.classList.add('pedido-atrasado');
        }
    });
}

// --- FUNÇÃO PARA CARREGAR CLIENTES (clientes.html) ---
async function carregarClientes() {
    const tabelaBody = document.querySelector('#tabelaClientes tbody');
    if (!tabelaBody) return;

    let clientes = [];
    try {
        const resp = await fetch('http://localhost:3000/api/clientes', { headers: getAuthHeaders() });
        if (resp.ok) {
            clientes = await resp.json();
        } else {
            // fallback: extrair clientes dos pedidos locais
            const pedidos = readLocalPedidos();
            const map = {};
            pedidos.forEach(p => { if (p.nomeCliente) map[p.nomeCliente] = { nomeCliente: p.nomeCliente, contato: p.contato || '', endereco: '' }; });
            clientes = Object.values(map);
        }
    } catch (err) {
        const pedidos = readLocalPedidos();
        const map = {};
        pedidos.forEach(p => { if (p.nomeCliente) map[p.nomeCliente] = { nomeCliente: p.nomeCliente, contato: p.contato || '', endereco: '' }; });
        clientes = Object.values(map);
    }

    tabelaBody.innerHTML = '';
    if (clientes.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="4">Nenhum cliente cadastrado.</td></tr>';
        return;
    }

    // (UI de criação de planos removida; exibição simplificada abaixo)

    clientes.forEach(cliente => {
        const linha = tabelaBody.insertRow();
        const nome = cliente.nomeCliente || cliente.nome || '';
        linha.insertCell().textContent = nome;
        linha.insertCell().textContent = cliente.contato || '';
        linha.insertCell().textContent = cliente.endereco || '';
        const actions = linha.insertCell();
        // Passa o nome do cliente como query param para a página historico
        actions.innerHTML = `
            <button onclick="window.location.href='historico.html?cliente=${encodeURIComponent(nome)}'">Ver Pedidos</button>
        `;
    });

    // Exibe informação simples do plano (primeiro plano retornado) e contagem de clientes
    const planList = document.getElementById('planList');
    const planNote = document.getElementById('planNote');
    const clienteCountEl = document.getElementById('clienteCount');
    try {
        const resp = await fetch('http://localhost:3000/api/plans');
        if (resp.ok) {
            const plans = await resp.json();
            const plan = plans && plans.length ? plans[0] : null;
            if (plan) {
                planList.textContent = `${plan.name} — limite: ${plan.maxClientes && plan.maxClientes > 0 ? plan.maxClientes : 'ilimitado'}`;
                if (plan.maxClientes && plan.maxClientes > 0) {
                    planNote.textContent = `Limite ativo: máximo ${plan.maxClientes} clientes.`;
                } else {
                    planNote.textContent = 'Seu plano atual permite clientes ilimitados.';
                }
            } else {
                planList.textContent = 'Plano gratuito (padrão)';
                planNote.textContent = 'Recursos avançados disponíveis para assinantes.';
            }
        } else {
            planList.textContent = 'Plano: não disponível';
        }
    } catch (e) {
        if (planList) planList.textContent = 'Plano: erro ao carregar';
    }

    // contagem de clientes (usar API se disponível)
    let clientesCount = clientes.length;
    try {
        const resp2 = await fetch('http://localhost:3000/api/clientes', { headers: getAuthHeaders() });
        if (resp2.ok) {
            const cl = await resp2.json();
            clientesCount = cl.length;
        }
    } catch (e) { /* ignore */ }
    if (clienteCountEl) clienteCountEl.textContent = `Total de clientes cadastrados: ${clientesCount}`;
}

// --- Funções de Ação (marcarComoEntregue, reabrirPedido, excluirPedido) ---

function marcarComoEntregue(eOrEl) {
    // aceita tanto o event quanto o elemento passado (onclick="marcarComoEntregue(this)")
    const el = (eOrEl && eOrEl.target) ? eOrEl.target : eOrEl;
    const pedidoIdRaw = el?.dataset?.pedidoId;
    if (!pedidoIdRaw) { showToast('Erro: pedido não identificado.', 'error'); return; }
    let pedidos = readLocalPedidos();
    const pedidoIndex = pedidos.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));

    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex].status = "Entregue";
        // Atualiza localmente primeiro (offline-first)
        // Se estiver logado, tenta também atualizar no servidor
        const adminToken = localStorage.getItem('adminToken');

        // marca como sincronizando localmente até sabermos o resultado
        pedidos[pedidoIndex].pendenteSincronizacao = !!adminToken ? false : true;
        writeLocalPedidos(pedidos);

        if (adminToken) {
            // tenta atualizar no servidor (usa _id/serverId/legacyId/id conforme disponível)
            (async () => {
                try {
                    const localRec = pedidos[pedidoIndex];
                    let targetId = localRec._id || localRec.serverId || localRec.legacyId || localRec.id;
                    const headersUp = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken };
                    const resp = await fetch(`http://localhost:3000/api/pedidos/${encodeURIComponent(targetId)}`, {
                        method: 'PUT',
                        headers: headersUp,
                        body: JSON.stringify({ status: 'Entregue' })
                    });

                    if (resp.ok) {
                        const atualizado = await resp.json();
                        // atualiza local com qualquer id retornado e limpa flags
                        const armazenados = readLocalPedidos();
                        const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                        if (idx2 !== -1) {
                            armazenados[idx2].status = 'Entregue';
                            if (atualizado && atualizado._id) armazenados[idx2].serverId = atualizado._id;
                            armazenados[idx2].pendenteSincronizacao = false;
                            armazenados[idx2].syncError = false;
                            writeLocalPedidos(armazenados);
                        }
                    } else {
                        // marca para sincronizar depois
                        const armazenados = readLocalPedidos();
                        const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                        if (idx2 !== -1) {
                            armazenados[idx2].pendenteSincronizacao = true;
                            armazenados[idx2].syncError = true;
                            writeLocalPedidos(armazenados);
                        }
                    }
                } catch (e) {
                    // falha de rede: mantêm como pendente para sincronizar depois
                    const armazenados = readLocalPedidos();
                    const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                    if (idx2 !== -1) {
                        armazenados[idx2].pendenteSincronizacao = true;
                        armazenados[idx2].syncError = true;
                        writeLocalPedidos(armazenados);
                    }
                } finally {
                    // atualiza UI após tentativa
                    if (document.querySelector('#tabelaPedidos')) { carregarPedidos(); } 
                    else if (document.querySelector('#tabelaHistorico')) { buscarHistorico(); }
                }
            })();
        }

        // Recarrega a tabela correta dependendo da página (se não houver token, já atualizamos localmente)
        if (document.querySelector('#tabelaPedidos')) { carregarPedidos(); } 
        else if (document.querySelector('#tabelaHistorico')) { buscarHistorico(); }
    } else {
    showToast("Erro: Pedido não encontrado.", 'error');
    }
}

function reabrirPedido(eOrEl) {
    const el = (eOrEl && eOrEl.target) ? eOrEl.target : eOrEl;
    const pedidoIdRaw = el?.dataset?.pedidoId;
    if (!pedidoIdRaw) { showToast('Erro: pedido não identificado.', 'error'); return; }
    let pedidos = readLocalPedidos();
    const pedidoIndex = pedidos.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));

    if (pedidoIndex !== -1) {
        pedidos[pedidoIndex].status = "A Fazer"; // Status reaberto
        // marca como pendente de sincronização até confirmarmos update no servidor
        const adminToken = localStorage.getItem('adminToken');
        pedidos[pedidoIndex].pendenteSincronizacao = adminToken ? false : true;
        writeLocalPedidos(pedidos);

        if (adminToken) {
            (async () => {
                try {
                    const localRec = pedidos[pedidoIndex];
                    const targetId = localRec._id || localRec.serverId || localRec.legacyId || localRec.id;
                    const headersUp = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken };
                    const resp = await fetch(`http://localhost:3000/api/pedidos/${encodeURIComponent(targetId)}`, {
                        method: 'PUT',
                        headers: headersUp,
                        body: JSON.stringify({ status: 'A Fazer' })
                    });
                    if (resp.ok) {
                        const atualizado = await resp.json();
                        const armazenados = readLocalPedidos();
                        const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                        if (idx2 !== -1) {
                            armazenados[idx2].status = 'A Fazer';
                            if (atualizado && atualizado._id) armazenados[idx2].serverId = atualizado._id;
                            armazenados[idx2].pendenteSincronizacao = false;
                            armazenados[idx2].syncError = false;
                            writeLocalPedidos(armazenados);
                        }
                    } else {
                        const armazenados = readLocalPedidos();
                        const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                        if (idx2 !== -1) {
                            armazenados[idx2].pendenteSincronizacao = true;
                            armazenados[idx2].syncError = true;
                            writeLocalPedidos(armazenados);
                        }
                    }
                } catch (e) {
                    const armazenados = readLocalPedidos();
                    const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                    if (idx2 !== -1) {
                        armazenados[idx2].pendenteSincronizacao = true;
                        armazenados[idx2].syncError = true;
                        writeLocalPedidos(armazenados);
                    }
                } finally {
                    buscarHistorico();
                }
            })();
        } else {
            buscarHistorico();
        }
    showToast("Pedido reaberto com sucesso. Ele voltou para o Dashboard.", 'success');
    } else {
    showToast("Erro: Pedido não encontrado.", 'error');
    }
}

function excluirPedido(event) {
    const el = (event && event.target) ? event.target : event;
    const pedidoIdRaw = el?.dataset?.pedidoId;
    const confirmacao = confirm("Tem certeza de que deseja excluir este pedido? Esta ação não pode ser desfeita.");

    if (confirmacao) {
        const pedidos = readLocalPedidos() || [];
        const idx = pedidos.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
        const adminToken = localStorage.getItem('adminToken');

        if (idx === -1) {
            // nada a fazer
            return;
        }

        if (adminToken) {
            // tenta excluir do servidor; em caso de falha, marca pendenteExclusao
            (async () => {
                try {
                    const targetId = pedidos[idx]._id || pedidos[idx].serverId || pedidos[idx].legacyId || pedidos[idx].id;
                    const resp = await fetch(`http://localhost:3000/api/pedidos/${encodeURIComponent(targetId)}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + adminToken } });
                    if (resp.ok) {
                        // remove localmente
                        const novosPedidos = (readLocalPedidos() || []).filter(p => !(String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw)));
                        writeLocalPedidos(novosPedidos);
                    } else {
                        // marca para exclusão posterior
                        const armazenados = readLocalPedidos();
                        const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                        if (idx2 !== -1) {
                            armazenados[idx2].pendenteExclusao = true;
                            armazenados[idx2].syncError = true;
                            writeLocalPedidos(armazenados);
                        }
                    }
                } catch (e) {
                    // problema de rede: marca para exclusão posterior
                    const armazenados = readLocalPedidos();
                    const idx2 = armazenados.findIndex(p => String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw));
                    if (idx2 !== -1) {
                        armazenados[idx2].pendenteExclusao = true;
                        armazenados[idx2].syncError = true;
                        writeLocalPedidos(armazenados);
                    }
                } finally {
                    if (document.querySelector('#tabelaPedidos')) { carregarPedidos(); } 
                    else if (document.querySelector('#tabelaHistorico')) { buscarHistorico(); }
                }
            })();
        } else {
            // sem token: exclui localmente apenas
            const novosPedidos = (readLocalPedidos() || []).filter(p => !(String(p.id) === String(pedidoIdRaw) || String(p._id) === String(pedidoIdRaw) || String(p.serverId) === String(pedidoIdRaw) || String(p.legacyId) === String(pedidoIdRaw)));
            writeLocalPedidos(novosPedidos);
            if (document.querySelector('#tabelaPedidos')) { carregarPedidos(); } 
            else if (document.querySelector('#tabelaHistorico')) { buscarHistorico(); }
        }
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
    const pedidos = readLocalPedidos();
    // procura por múltiplos tipos de identificador (_id, serverId, legacyId ou id numérico)
    const pedidoParaEditar = pedidos.find(p =>
        String(p._id) === String(pedidoId) ||
        String(p.serverId) === String(pedidoId) ||
        String(p.legacyId) === String(pedidoId) ||
        String(p.id) === String(pedidoId)
    );

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
        // Normaliza data para o input[type=date] (YYYY-MM-DD)
        const inputDataEntrega = document.getElementById('inputDataEntrega');
        if (inputDataEntrega) {
            if (pedidoParaEditar.dataEntrega) {
                const dt = new Date(pedidoParaEditar.dataEntrega);
                if (!isNaN(dt.getTime())) inputDataEntrega.value = dt.toISOString().slice(0,10);
                else inputDataEntrega.value = '';
            } else {
                inputDataEntrega.value = '';
            }
        }
        
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
    showToast('Pedido não encontrado para edição.', 'error');
        // Redireciona para um novo pedido se o ID for inválido
        window.location.href = 'novo-pedido.html'; 
    }
}

async function salvarPedido(event) {
    event.preventDefault();

    const idInput = document.getElementById('pedidoId'); 
    
    // Validação de dados e coleta do array de itens
    const itensColetados = coletarItens();

    if (!document.getElementById('inputNomeCliente').value.trim() || !document.getElementById('inputDataEntrega').value || itensColetados.length === 0) {
         showToast('Por favor, preencha Nome do Cliente, Data de Entrega e adicione pelo menos um Item válido.', 'error');
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
        valorTotal: valorTotalCalculado,
        status: 'A Fazer'
    };

    let pedidos = readLocalPedidos();

    try {
        // Tenta salvar no servidor primeiro
        const headers = getAuthHeaders();
        headers['Content-Type'] = 'application/json';
        const response = await fetch('http://localhost:3000/api/pedidos', {
            method: 'POST',
            headers,
            body: JSON.stringify(dadosPedido)
        });

        if (response.ok) {
            // Se salvou no servidor com sucesso
            const pedidoSalvo = await response.json();
            // Atualiza o localStorage com o ID do MongoDB
            const pedidoLocal = {
                ...dadosPedido,
                id: Date.now(), // ID local para compatibilidade
                _id: pedidoSalvo._id // ID do MongoDB
            };
            pedidos.push(pedidoLocal);
            writeLocalPedidos(pedidos);
            window.location.href = 'index.html';
            return;
        }
    } catch (error) {
        console.error('Erro ao salvar no servidor:', error);
        // Se falhou em salvar no servidor, salva apenas no localStorage
        const pedidoLocal = {
            ...dadosPedido,
            id: Date.now(),
            pendenteSincronizacao: true // Marca para sincronizar depois
        };
        pedidos.push(pedidoLocal);
        writeLocalPedidos(pedidos);
        window.location.href = 'index.html';
    }

    // Se há um idInput, tentaremos atualizar via API e localStorage
    if (idInput && idInput.value) {
        const pedidoId = idInput.value;

        // Atualiza localmente para manter funcionamento offline
        const pedidoIndex = pedidos.findIndex(p =>
            String(p.id) === String(pedidoId) ||
            String(p._id) === String(pedidoId) ||
            String(p.serverId) === String(pedidoId) ||
            String(p.legacyId) === String(pedidoId)
        );
        if (pedidoIndex !== -1) {
            pedidos[pedidoIndex] = { ...pedidos[pedidoIndex], ...dadosPedido };
        }

        // Tenta atualizar no backend (usa _id/serverId se disponível localmente, senão usa o pedidoId)
        try {
            const headersUp = getAuthHeaders();
            headersUp['Content-Type'] = 'application/json';
            // escolhe id alvo para o PUT: prefer _id/serverId do registro local
            let targetId = pedidoId;
            if (pedidoIndex !== -1) {
                const localRec = pedidos[pedidoIndex];
                targetId = localRec._id || localRec.serverId || targetId;
            }
            const resp = await fetch(`http://localhost:3000/api/pedidos/${targetId}`, {
                method: 'PUT',
                headers: headersUp,
                body: JSON.stringify(dadosPedido)
            });

                if (resp.ok) {
                const atualizado = await resp.json();
                // opcional: sincronizar alguma informação retornada
                console.log('Pedido atualizado no servidor:', atualizado);
                writeLocalPedidos(pedidos);
                showToast('Pedido atualizado com sucesso!', 'success');
                window.location.href = 'index.html';
                return;
            } else {
                console.warn('Falha ao atualizar no servidor, usando localStorage');
            }
        } catch (err) {
            console.warn('Erro ao conectar com a API, salvando localmente:', err.message || err);
        }

        // Fallback: salva localmente
        writeLocalPedidos(pedidos);
    showToast('Pedido atualizado localmente (sem conexão com o servidor).', 'info');
        window.location.href = 'index.html';
        return;
    }

    // NOVO PEDIDO: cria um ID local (legacy) e tenta enviar ao backend
    const novoPedido = { 
        id: gerarId(), 
        status: "A Fazer", 
        dataCriacao: Date.now(), // Adiciona a data de criação
        ...dadosPedido 
    };

    // Atualiza localStorage imediatamente (funcionamento offline)
    pedidos.push(novoPedido);
    writeLocalPedidos(pedidos);

    // Tenta enviar ao backend (inclui legacyId para mapear dados locais)
    try {
        const headers2 = getAuthHeaders();
        headers2['Content-Type'] = 'application/json';
        const resp = await fetch('http://localhost:3000/api/pedidos', {
            method: 'POST',
            headers: headers2,
            body: JSON.stringify({ legacyId: novoPedido.id, ...dadosPedido, dataCriacao: novoPedido.dataCriacao })
        });

        if (resp.ok) {
            const criado = await resp.json();
            console.log('Pedido criado no servidor:', criado);
            // Atualiza o localStorage para marcar o pedido com o serverId
            try {
                const armazenados = readLocalPedidos();
                const idx = armazenados.findIndex(p => p.id === criado.legacyId || p.id === novoPedido.id || String(p.legacyId) === String(criado.legacyId));
                if (idx !== -1) {
                    armazenados[idx].serverId = criado._id;
                    armazenados[idx].serverCreatedAt = criado.createdAt || criado.dataCriacao || new Date().toISOString();
                    writeLocalPedidos(armazenados);
                }
            } catch (e) {
                console.warn('Não foi possível atualizar localStorage com serverId:', e);
            }
            showToast('Novo pedido salvo com sucesso!', 'success');
            window.location.href = 'index.html';
            return;
        } else {
            console.warn('Falha ao salvar no servidor, pedido salvo localmente.');
            showToast('Novo pedido salvo localmente (não foi possível salvar no servidor).', 'info');
            window.location.href = 'index.html';
            return;
        }
    } catch (err) {
        console.warn('Erro ao conectar com a API, pedido salvo localmente:', err.message || err);
    showToast('Novo pedido salvo localmente (sem conexão com o servidor).', 'info');
        window.location.href = 'index.html';
        return;
    }
}


// --- Lógica para a página de Ordem de Serviço (os.html) ---
async function inicializarOS() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');
    const osCard = document.getElementById('osDetalhesCard'); 
    
    if (!pedidoId || !osCard) return;

    let pedidos = readLocalPedidos();
    // Tenta encontrar pelo mais comum: id numérico
    let pedido = pedidos.find(p => String(p.id) === String(pedidoId) || String(p.legacyId) === String(pedidoId) || String(p.serverId) === String(pedidoId) || String(p._id) === String(pedidoId));

    // Se não encontrou localmente, tenta buscar do servidor (se houver token)
    if (!pedido) {
        const token = localStorage.getItem('adminToken');
        if (token) {
            try {
                const resp = await fetch('http://localhost:3000/api/pedidos', { headers: getAuthHeaders() });
                if (resp.ok) {
                    const serverPedidos = await resp.json();
                    pedido = serverPedidos.find(p => String(p._id) === String(pedidoId) || String(p.legacyId) === String(pedidoId));
                }
            } catch (e) {
                console.warn('Erro ao buscar pedido no servidor para OS:', e);
            }
        }
    }

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
    const dataEmissao = formatDateForDisplay(pedido.dataCriacao || pedido.id);
    
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
    document.getElementById('osDataEntrega').textContent = formatDateForDisplay(pedido.dataEntrega);
    
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
            const pid = getPedidoIdentifier(pedido);
            window.location.href = `novo-pedido.html?id=${pid}`;
        };
        // --------------------------------------------------
    }
}


// --- INICIALIZAÇÃO GERAL AO CARREGAR O DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o UI de autenticação (mostra nome da loja / botão sair)
    initAuthUI();
    
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

    async function carregarOrdemDeServico() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('id');
    const osContainer = document.getElementById('os-container');
    
    // Busca o botão de edição que está no seu HTML fixo
    const btnEditar = document.getElementById('btnEditarPedido'); 
    
    if (!pedidoId || !osContainer) return;

    const pedidos = readLocalPedidos();
    let pedido = pedidos.find(p =>
        String(p.id) === String(pedidoId) ||
        String(p._id) === String(pedidoId) ||
        String(p.serverId) === String(pedidoId) ||
        String(p.legacyId) === String(pedidoId)
    );

    // Se não encontrado localmente, tenta buscar no servidor (se tiver token)
    if (!pedido) {
        const token = localStorage.getItem('adminToken');
        if (token) {
            try {
                const resp = await fetch('http://localhost:3000/api/pedidos', { headers: getAuthHeaders() });
                if (resp.ok) {
                    const serverPedidos = await resp.json();
                    pedido = serverPedidos.find(p => String(p._id) === String(pedidoId) || String(p.legacyId) === String(pedidoId));
                }
            } catch (e) {
                console.warn('Erro ao buscar pedido no servidor para OS:', e);
            }
        }
    }

    if (pedido) {
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorTotal);
        const dataPedido = formatDateForDisplay(pedido.dataCriacao || pedido.id);

        const displayNumber = getPedidoDisplayNumber(pedido);
        osContainer.innerHTML = `
            <div class="os-header">
                <h2>ORDEM DE SERVIÇO N° ${displayNumber}</h2>
                <p>Data de Emissão: <strong>${dataPedido}</strong></p>
            </div>

                <div class="os-cliente">
                <h3>Dados do Cliente</h3>
                <p>Nome: <strong>${pedido.nomeCliente}</strong></p>
                <p>Contato: <strong>${pedido.contato}</strong></p>
                <p>Status: <span class="os-status os-status-${(pedido.status || '').replace(/\s/g, '').toLowerCase()}">
                    ${pedido.status}
                </span></p>
                </div>
            
            <div class="os-producao">
                <h3>Detalhes do Serviço/Produção</h3>
                
                <div class="campo-os">
                    <h4>Descrição do Serviço:</h4>
                    <p class="detalhe-grande">${pedido.descricaoServico || ''}</p>
                </div>
                
                <div class="campo-os">
                    <h4>Detalhes de Tamanho / Quantidade (Produção):</h4>
                    <p class="detalheTamanho">${pedido.detalhesTamanho || 'N/A'}</p>
                </div>
                
                <div class="os-info-grid">
                    <div>
                        <h4>Data de Entrega:</h4>
                        <p>${formatDateForDisplay(pedido.dataEntrega)}</p>
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

        if (btnEditar) {
            btnEditar.onclick = function() {
                const pid = getPedidoIdentifier(pedido);
                window.location.href = `novo-pedido.html?id=${pid}`;
            };
        }
    } else {
        osContainer.innerHTML = `<p>Ordem de Serviço N° ${pedidoId} não encontrada.</p>`;
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

    // --- LÓGICA DE INICIALIZAÇÃO DA PÁGINA CLIENTES (clientes.html) ---
    if (document.querySelector('#tabelaClientes')) {
        carregarClientes();
    }
    
});