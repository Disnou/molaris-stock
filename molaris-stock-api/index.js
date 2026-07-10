const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: "postgresql://postgres:yitzhak20072347123@db.icjsarcbcbqwjnouylnf.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

// --- LISTAR REAGENTES (alimenta o <select> do painel) ---
app.get('/reagentes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reagentes ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar reagentes:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- LISTAR LOTES ---
// Precisa do JOIN com "reagentes" porque o painel usa item.nome e
// item.unidade_base, que não existem na tabela "lotes" sozinha.
app.get('/estoque', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, r.nome, r.unidade_base
            FROM lotes l
            JOIN reagentes r ON r.id = l.reagente_id
            ORDER BY l.numero_lote
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar lotes:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- CADASTRAR NOVO LOTE ---
app.post('/novo-lote', async (req, res) => {
    try {
        // o painel envia "quantidade_atual" no corpo da requisição
        const { reagente_id, numero_lote, quantidade_atual, data_validade } = req.body;

        const query = `
            INSERT INTO lotes (reagente_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`;

        await pool.query(query, [reagente_id, numero_lote, quantidade_atual, quantidade_atual, data_validade]);

        res.json({ message: "Lote cadastrado com sucesso!" });
    } catch (err) {
        console.error("Erro ao inserir lote:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- DAR BAIXA NO ESTOQUE (botão "Usar") ---
app.put('/baixar-estoque', async (req, res) => {
    try {
        const { numero_lote, quantidade_usada } = req.body;

        const query = `
            UPDATE lotes
            SET quantidade_atual = quantidade_atual - $1
            WHERE numero_lote = $2
            RETURNING *`;

        const result = await pool.query(query, [quantidade_usada, numero_lote]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Lote não encontrado" });
        }

        res.json({ message: "Baixa registrada com sucesso!", lote: result.rows[0] });
    } catch (err) {
        console.error("Erro ao dar baixa:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- EXCLUIR LOTE (botão "Excluir") ---
app.delete('/excluir-lote/:lote', async (req, res) => {
    try {
        const { lote } = req.params;
        await pool.query('DELETE FROM lotes WHERE numero_lote = $1', [lote]);
        res.json({ message: "Lote excluído com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir lote:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- CADASTRAR USUÁRIO (botão "Criar meu acesso" no login) ---
app.post('/cadastrar-usuario', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const query = `INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *`;
        await pool.query(query, [nome, email, senha]);
        res.status(201).json({ message: "Sucesso!" });
    } catch (err) {
        console.error("Erro ao cadastrar usuário:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND senha = $2', [email, senha]);
        if (result.rows.length > 0) {
            // devolve o nome para o front-end mostrar "Cientista logado: <nome>"
            res.json({ message: "Sucesso!", nome: result.rows[0].nome });
        } else {
            res.status(401).json({ error: "Inválido" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000 - CONECTADO AO BANCO CORRETO'));