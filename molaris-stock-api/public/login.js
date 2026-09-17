document.addEventListener('DOMContentLoaded', () => {
    let modoCadastro = false;

    const alertBox = document.getElementById('alert-box');

    function exibirAlerta(mensagem, tipo = 'erro') {
        if (!alertBox) return;
        alertBox.style.display = 'block';
        alertBox.innerText = mensagem;
        if (tipo === 'erro') {
            alertBox.style.background = 'rgba(248,113,113,0.14)';
            alertBox.style.borderColor = 'rgba(248,113,113,0.4)';
            alertBox.style.color = '#f87171';
        } else {
            alertBox.style.background = 'rgba(52,211,153,0.14)';
            alertBox.style.borderColor = 'rgba(52,211,153,0.4)';
            alertBox.style.color = '#34d399';
        }
    }

    function limparAlerta() {
        if (alertBox) alertBox.style.display = 'none';
    }

    // --- ALTERNAR ENTRE LOGIN E CADASTRO ---
    function alternarCadastro() {
        limparAlerta();
        modoCadastro = !modoCadastro;
        document.getElementById('campo-nome').style.display = modoCadastro ? 'block' : 'none';
        document.getElementById('campo-cargo').style.display = modoCadastro ? 'block' : 'none';
        document.getElementById('btn-entrar').style.display = modoCadastro ? 'none' : 'block';

        const btnCadastro = document.getElementById('btn-cadastro');
        btnCadastro.innerText = modoCadastro ? 'Confirmar Cadastro' : 'Criar meu acesso';
        btnCadastro.onclick = modoCadastro ? cadastrarUsuario : alternarCadastro;
    }

    // --- FUNÇÃO DE CADASTRO ---
    async function cadastrarUsuario() {
        limparAlerta();
        const nome = document.getElementById('nome').value.trim();
        const cargo = document.getElementById('cargo').value;
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;

        if (!nome || !email || !senha) {
            exibirAlerta('Por favor, preencha todos os campos para cadastrar o cientista.');
            return;
        }

        try {
            const response = await fetch('/cadastrar-usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha, cargo })
            });

            const data = await response.json();
            if (response.status === 201 || data.message?.includes('sucesso')) {
                exibirAlerta('Cientista cadastrado com sucesso! Agora faça login.', 'sucesso');
                setTimeout(alternarCadastro, 1200);
            } else {
                tratarErroBackend(data.error || 'Erro ao cadastrar');
            }
        } catch (err) {
            tratarErroConexao(err);
        }
    }

    // --- FUNÇÃO DE LOGIN ---
    async function logarUsuario() {
        limparAlerta();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;

        if (!email || !senha) {
            exibirAlerta('Informe e-mail e senha de acesso.');
            return;
        }

        const btnEntrar = document.getElementById('btn-entrar');
        const textoOriginal = btnEntrar.innerText;
        btnEntrar.innerText = 'Autenticando...';
        btnEntrar.disabled = true;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('usuario', data.usuario?.nome || email);
                sessionStorage.setItem('cargo', data.usuario?.cargo || 'Cientista');
                sessionStorage.setItem('email', data.usuario?.email || email);
                window.location.href = 'painel.html';
            } else {
                tratarErroBackend(data.error || 'Login inválido');
            }
        } catch (err) {
            tratarErroConexao(err);
        } finally {
            btnEntrar.innerText = textoOriginal;
            btnEntrar.disabled = false;
        }
    }

    function tratarErroBackend(msg) {
        if (msg.includes('ENOTFOUND') || msg.includes('tenant') || msg.includes('getaddrinfo')) {
            exibirAlerta('⚠️ O banco de dados no Supabase está temporariamente pausado por inatividade. Acesse o painel do Supabase e clique em "Restore project" para religá-lo em 1 minuto.');
        } else {
            exibirAlerta('Erro: ' + msg);
        }
    }

    function tratarErroConexao(err) {
        exibirAlerta('Não foi possível conectar ao servidor. Verifique se o backend está ativo.');
        console.error(err);
    }

    // Expor no escopo global
    window.cadastrar = alternarCadastro;
    window.logar = logarUsuario;
    window.alternarCadastro = alternarCadastro;
});