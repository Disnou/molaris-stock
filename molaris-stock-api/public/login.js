document.addEventListener('DOMContentLoaded', () => {

    let modoCadastro = false;

    // --- ALTERNAR ENTRE LOGIN E CADASTRO ---
    function alternarCadastro() {
        modoCadastro = !modoCadastro;
        document.getElementById('campo-nome').style.display = modoCadastro ? 'block' : 'none';
        document.getElementById('btn-entrar').style.display = modoCadastro ? 'none' : 'block';

        const btnCadastro = document.getElementById('btn-cadastro');
        btnCadastro.innerText = modoCadastro ? 'Confirmar Cadastro' : 'Criar meu acesso';
        btnCadastro.onclick = modoCadastro ? cadastrarUsuario : alternarCadastro;
    }

    // --- FUNÇÃO DE CADASTRO ---
    async function cadastrarUsuario() {
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        if (!nome || !email || !senha) {
            alert('Preencha todos os campos!');
            return;
        }

        try {
            // AQUI FOI ALTERADO: de http://localhost:3000/cadastrar-usuario para apenas /cadastrar-usuario
            const response = await fetch('/cadastrar-usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });

            const data = await response.json();
            if (response.status === 201 || data.message === "Sucesso!") {
                alert('Cientista cadastrado com sucesso! Agora faça login.');
                alternarCadastro(); 
            } else {
                alert('Erro ao cadastrar: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (err) {
            alert('Não foi possível conectar ao servidor.');
            console.error(err);
        }
    }

    // --- FUNÇÃO DE LOGIN ---
    async function logarUsuario() {
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        if (!email || !senha) {
            alert('Preencha e-mail e senha!');
            return;
        }

        try {
            // AQUI FOI ALTERADO: de http://localhost:3000/login para apenas /login
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('usuario', data.nome || email);
                window.location.href = 'painel.html';
            } else {
                alert('Erro: ' + (data.error || 'Login inválido'));
            }
        } catch (err) {
            alert('Erro de conexão com o servidor.');
            console.error(err);
        }
    }

    // Expondo as funções para o HTML
    window.cadastrar = alternarCadastro;
    window.logar = logarUsuario;
    window.alternarCadastro = alternarCadastro;
});