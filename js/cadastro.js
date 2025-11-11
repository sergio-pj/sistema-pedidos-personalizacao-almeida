// cadastro.js - Frontend

const API_URL = window.API_CONFIG ? window.API_CONFIG.getApiUrl() : 'http://localhost:3000/api';

document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const nomeLoja = document.getElementById('nomeLoja').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmaSenha = document.getElementById('confirmaSenha').value;
    const plano = document.getElementById('plano').value;

    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';

    if (!nome || !email || !telefone || !nomeLoja || !senha || !confirmaSenha) {
        errorMessage.textContent = 'Todos os campos são obrigatórios';
        errorMessage.style.display = 'block';
        return;
    }

    if (senha !== confirmaSenha) {
        errorMessage.textContent = 'As senhas não coincidem';
        errorMessage.style.display = 'block';
        return;
    }

    if (senha.length < 6) {
        errorMessage.textContent = 'A senha deve ter pelo menos 6 caracteres';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome,
                email,
                telefone,
                nomeLoja,
                senha,
                plano
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao cadastrar');
        }

        if (data.token) {
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminData', JSON.stringify(data.admin));
            
            alert('Cadastro realizado com sucesso!');
            window.location.href = 'index.html';
        } else {
            throw new Error('Token não recebido');
        }

    } catch (error) {
        console.error('Erro no cadastro:', error);
        errorMessage.textContent = error.message || 'Erro ao conectar com o servidor';
        errorMessage.style.display = 'block';
    }
});
