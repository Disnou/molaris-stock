require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// --- ROTAS DE AUTENTICAÇÃO (LOGIN E CADASTRO) ---
app.post('/cadastrar-usuario', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)', [nome, email, senha]);
    res.json({ mensagem: 'Cientista cadastrado com sucesso!' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ erro: 'Este email já está cadastrado.' });
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND senha = $2', [email, senha]);
    if (rows.length === 0) return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    res.json({ mensagem: 'Login aprovado!', usuario: rows[0].nome });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

// --- ROTAS DO ESTOQUE ---
// Nova rota: Busca a lista de reagentes para montar a caixinha de seleção
app.get('/reagentes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reagentes ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});

app.get('/estoque', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT reagentes.nome, lotes.numero_lote, lotes.quantidade_atual, reagentes.unidade_base, lotes.data_validade
      FROM lotes
      JOIN reagentes ON lotes.reagente_id = reagentes.id
      ORDER BY lotes.id ASC;
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});

app.put('/baixar-estoque', async (req, res) => {
  try {
    const { numero_lote, quantidade_usada } = req.body;
    const consulta = await pool.query('SELECT quantidade_atual FROM lotes WHERE numero_lote = $1', [numero_lote]);
    if (consulta.rowCount === 0) return res.status(404).json({ erro: 'Lote não encontrado.' });
    
    const estoqueAtual = consulta.rows[0].quantidade_atual;
    if (quantidade_usada > estoqueAtual) return res.status(400).json({ erro: `Estoque insuficiente! Apenas ${estoqueAtual} disponíveis.` });

    const resultado = await pool.query('UPDATE lotes SET quantidade_atual = quantidade_atual - $1 WHERE numero_lote = $2 RETURNING *', [quantidade_usada, numero_lote]);
    res.json({ mensagem: 'Sucesso!', lote: resultado.rows[0] });
  } catch (err) {
    res.status(500).send('Erro interno');
  }
});

app.post('/novo-lote', async (req, res) => {
  try {
    const { reagente_id, numero_lote, quantidade_atual, data_validade } = req.body;
    const loteExistente = await pool.query('SELECT * FROM lotes WHERE numero_lote = $1', [numero_lote]);

    if (loteExistente.rowCount > 0) {
      const resultado = await pool.query('UPDATE lotes SET quantidade_atual = quantidade_atual + $1 WHERE numero_lote = $2 RETURNING *', [quantidade_atual, numero_lote]);
      return res.json({ mensagem: 'Estoque reabastecido!', lote: resultado.rows[0] });
    } else {
      const resultado = await pool.query('INSERT INTO lotes (reagente_id, numero_lote, quantidade_atual, data_validade) VALUES ($1, $2, $3, $4) RETURNING *', [reagente_id, numero_lote, quantidade_atual, data_validade]);
      return res.json({ mensagem: 'Novo lote cadastrado!', lote: resultado.rows[0] });
    }
  } catch (err) {
    res.status(500).send('Erro ao cadastrar lote.');
  }
});

app.delete('/excluir-lote/:numero_lote', async (req, res) => {
  try {
    const { numero_lote } = req.params;
    const resultado = await pool.query('DELETE FROM lotes WHERE numero_lote = $1 RETURNING *', [numero_lote]);
    if (resultado.rowCount === 0) return res.status(404).json({ erro: 'Lote não encontrado para exclusão.' });
    res.json({ mensagem: 'Lote excluído com sucesso!' });
  } catch (err) {
    res.status(500).send('Erro interno ao excluir o lote.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));