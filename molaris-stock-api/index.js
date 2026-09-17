require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const { REGRAS_FEDERAIS, ESTADOS_BRASIL } = require('./regulatory_data');

const app = express();
app.use(cors());
app.use(express.json());

// --- SERVIR ARQUIVOS ESTÁTICOS DO FRONT-END ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.redirect('/login.html');
});

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.icjsarcbcbqwjnouylnf:yitzhak20072347123@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

// Tratamento de erros globais do pool para não derrubar o processo
pool.on('error', (err) => {
    console.error('⚠️ [Pool Error]:', err.message);
});

// --- ESTADO DO ROBÔ CRON & KEEP-ALIVE ---
const roboCron = {
    totalPings: 0,
    pingsComSucesso: 0,
    falhasConsecutivas: 0,
    ultimoPing: null,
    ultimaLatenciaMs: 0,
    status: 'INICIANDO',
    ultimoErro: null,
    historico: [],
    iniciadoEm: new Date()
};

async function executarPingBanco() {
    const inicio = Date.now();
    roboCron.totalPings++;
    try {
        await pool.query('SELECT 1 AS keepalive');
        const latencia = Date.now() - inicio;
        roboCron.pingsComSucesso++;
        roboCron.falhasConsecutivas = 0;
        roboCron.ultimoPing = new Date();
        roboCron.ultimaLatenciaMs = latencia;
        roboCron.status = 'ONLINE';
        roboCron.ultimoErro = null;

        const registro = {
            data: new Date().toISOString(),
            status: 'SUCESSO',
            latenciaMs: latencia,
            mensagem: 'Banco ativo e respondendo normalmente'
        };
        roboCron.historico.unshift(registro);
        if (roboCron.historico.length > 20) roboCron.historico.pop();

        console.log(`🤖 [ROBÔ CRON] Ping # ${roboCron.totalPings} OK em ${latencia}ms. Banco ativo!`);
        return { sucesso: true, latencia };
    } catch (err) {
        roboCron.falhasConsecutivas++;
        roboCron.status = 'OFFLINE/PAUSADO';
        roboCron.ultimoPing = new Date();
        roboCron.ultimoErro = err.message;

        const registro = {
            data: new Date().toISOString(),
            status: 'FALHA',
            latenciaMs: Date.now() - inicio,
            mensagem: err.message
        };
        roboCron.historico.unshift(registro);
        if (roboCron.historico.length > 20) roboCron.historico.pop();

        console.error(`⚠️ [ROBÔ CRON] Falha ao comunicar com o banco (${roboCron.falhasConsecutivas}x):`, err.message);
        return { sucesso: false, erro: err.message };
    }
}

// Inicia o loop do Robô Keep-Alive (executa a cada 8 minutos para evitar sono do Render e pausa do Supabase)
const INTERVALO_ROBO_MS = 8 * 60 * 1000;
setInterval(executarPingBanco, INTERVALO_ROBO_MS);
setTimeout(executarPingBanco, 3000); // primeiro ping após inicialização

// --- AUTO-MIGRAÇÃO E GARANTIA DE ESTRUTURA DO BANCO ---
async function inicializarBanco() {
    console.log('🔄 Verificando e migrando estrutura do banco de dados...');
    try {
        // 1. Tabela de usuários
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                cargo VARCHAR(80) DEFAULT 'Cientista / Analista',
                criado_em TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(80) DEFAULT 'Cientista / Analista';`);

        // 2. Tabela de reagentes com campos regulatórios e físico-químicos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reagentes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                cas_number VARCHAR(30),
                unidade_base VARCHAR(20) NOT NULL,
                estoque_minimo NUMERIC NOT NULL,
                formula_molecular VARCHAR(50),
                grau_pureza VARCHAR(50) DEFAULT 'P.A.',
                orgao_regulador VARCHAR(80) DEFAULT 'Nenhum',
                localizacao VARCHAR(120) DEFAULT 'Bancada Principal'
            );
        `);
        await pool.query(`ALTER TABLE reagentes ADD COLUMN IF NOT EXISTS formula_molecular VARCHAR(50);`);
        await pool.query(`ALTER TABLE reagentes ADD COLUMN IF NOT EXISTS grau_pureza VARCHAR(50) DEFAULT 'P.A.';`);
        await pool.query(`ALTER TABLE reagentes ADD COLUMN IF NOT EXISTS orgao_regulador VARCHAR(80) DEFAULT 'Nenhum';`);
        await pool.query(`ALTER TABLE reagentes ADD COLUMN IF NOT EXISTS localizacao VARCHAR(120) DEFAULT 'Bancada Principal';`);
        await pool.query(`ALTER TABLE reagentes ADD COLUMN IF NOT EXISTS categoria VARCHAR(60) DEFAULT 'Geral';`);
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reagentes_nome_unico ON reagentes (LOWER(TRIM(nome)));`);

        // 3. Tabela de lotes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lotes (
                id SERIAL PRIMARY KEY,
                reagente_id INTEGER REFERENCES reagentes(id) ON DELETE CASCADE,
                numero_lote VARCHAR(60) NOT NULL,
                quantidade_inicial NUMERIC NOT NULL,
                quantidade_atual NUMERIC NOT NULL,
                data_validade DATE NOT NULL,
                data_fabricacao DATE,
                data_abertura DATE,
                fornecedor VARCHAR(100),
                status VARCHAR(30) DEFAULT 'ativo'
            );
        `);
        await pool.query(`ALTER TABLE lotes ADD COLUMN IF NOT EXISTS data_fabricacao DATE;`);
        await pool.query(`ALTER TABLE lotes ADD COLUMN IF NOT EXISTS data_abertura DATE;`);
        await pool.query(`ALTER TABLE lotes ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(100);`);
        await pool.query(`ALTER TABLE lotes ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ativo';`);

        // 4. Tabela de movimentações (Audit Trail / Rastreabilidade RDC & ISO)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id SERIAL PRIMARY KEY,
                lote_id INTEGER,
                numero_lote VARCHAR(60),
                reagente_nome VARCHAR(100),
                tipo VARCHAR(30) NOT NULL,
                quantidade NUMERIC NOT NULL,
                unidade VARCHAR(20),
                motivo VARCHAR(255),
                usuario_nome VARCHAR(100),
                criado_em TIMESTAMP DEFAULT NOW()
            );
        `);

        // 5. Seed inicial de reagentes se a tabela estiver vazia
        const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM reagentes');
        if (parseInt(countRows[0].count, 10) === 0) {
            console.log('🌱 Inserindo reagentes iniciais e controlados no banco...');
            const reagentesIniciais = [
                ['Ácido Clorídrico 37%', '7647-01-0', 'L', 2, 'HCl', 'P.A.', 'Polícia Federal', 'Armário Corta-Fogo A'],
                ['Ácido Sulfúrico 98%', '7664-93-9', 'L', 3, 'H2SO4', 'P.A.', 'Polícia Federal', 'Armário Corta-Fogo A'],
                ['Ácido Nítrico 65%', '7697-37-2', 'L', 2, 'HNO3', 'P.A.', 'Exército Brasileiro', 'Armário Corta-Fogo B'],
                ['Hidróxido de Sódio P.A.', '1310-73-2', 'kg', 5, 'NaOH', 'P.A.', 'Nenhum', 'Prateleira de Bases'],
                ['Etanol Absoluto', '64-17-5', 'L', 10, 'C2H5OH', 'P.A. 99.5%', 'Polícia Civil', 'Depósito de Inflamáveis'],
                ['Acetona P.A.', '67-64-1', 'L', 5, 'C3H6O', 'P.A.', 'Polícia Federal', 'Armário de Solventes'],
                ['Cloreto de Sódio', '7647-14-5', 'kg', 5, 'NaCl', 'Puro', 'Nenhum', 'Bancada Geral'],
                ['Sulfato de Cobre II', '7758-98-7', 'kg', 1, 'CuSO4', 'P.A.', 'Nenhum', 'Prateleira de Sais']
            ];

            for (const r of reagentesIniciais) {
                await pool.query(`
                    INSERT INTO reagentes (nome, cas_number, unidade_base, estoque_minimo, formula_molecular, grau_pureza, orgao_regulador, localizacao)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, r);
            }
            console.log('✅ Reagentes de demonstração inseridos com sucesso!');
        }

        console.log('✅ Banco de dados MolarisStock sincronizado e pronto!');
    } catch (err) {
        console.error('⚠️ Atenção: Não foi possível sincronizar o banco agora (ele pode estar pausado no Supabase):', err.message);
    }
}

// Executa a verificação do banco após ligar o servidor
inicializarBanco();

// =========================================================================
// ROTAS DO SISTEMA & API
// =========================================================================

// --- HEALTHCHECK & KEEP-ALIVE ---
const responderHealth = (req, res) => {
    res.json({
        status: 'OK',
        servidor: 'Online',
        mensagem: 'MolarisStock API operacional',
        tempoAtividadeSegundos: Math.floor(process.uptime()),
        roboCron: {
            status: roboCron.status,
            totalPings: roboCron.totalPings,
            pingsComSucesso: roboCron.pingsComSucesso,
            falhasConsecutivas: roboCron.falhasConsecutivas,
            ultimoPing: roboCron.ultimoPing,
            ultimaLatenciaMs: roboCron.ultimaLatenciaMs,
            ultimoErro: roboCron.ultimoErro,
            intervaloMinutos: 8
        }
    });
};

app.get('/api/health', responderHealth);
app.get('/health', responderHealth);
app.get('/ping', responderHealth);

// Robô de auto-ping externo para evitar suspensão no Render Free Tier
const urlExterna = process.env.RENDER_EXTERNAL_URL || 'https://molaris-stock.onrender.com';
if (urlExterna) {
    setInterval(() => {
        try {
            const https = urlExterna.startsWith('https') ? require('https') : require('http');
            https.get(`${urlExterna}/api/health`, (resp) => {
                console.log(`🌐 [KEEP-ALIVE EXTERNO] Auto-ping enviado para ${urlExterna}/api/health (Status ${resp.statusCode})`);
            }).on('error', (err) => {
                console.log(`⚠️ [KEEP-ALIVE EXTERNO] Falha no auto-ping: ${err.message}`);
            });
        } catch (e) {}
    }, 10 * 60 * 1000); // a cada 10 minutos
}

app.get('/api/cron/keepalive', async (req, res) => {
    const resultado = await executarPingBanco();
    res.json({
        mensagem: 'Heartbeat executado pelo Robô Cron',
        timestamp: new Date().toISOString(),
        resultado,
        roboCron
    });
});

// --- MÓDULO REGULATÓRIO & ESTADOS ---
app.get('/regulamentacao/estados', (req, res) => {
    res.json(ESTADOS_BRASIL);
});

app.get('/regulamentacao/federais', (req, res) => {
    res.json(REGRAS_FEDERAIS);
});

// --- AUTENTICAÇÃO SEGURA COM BCRYPT ---
app.post('/cadastrar-usuario', async (req, res) => {
    try {
        const { nome, email, senha, cargo } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
        }

        const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: "Este e-mail já está cadastrado no laboratório." });
        }

        const hashSenha = await bcrypt.hash(senha, 10);
        const cargoFinal = cargo || 'Cientista / Analista';

        await pool.query(
            'INSERT INTO usuarios (nome, email, senha, cargo) VALUES ($1, $2, $3, $4)',
            [nome, email, hashSenha, cargoFinal]
        );

        res.status(201).json({ message: "Cientista cadastrado com sucesso!" });
    } catch (err) {
        console.error("Erro ao cadastrar usuário:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ error: "Informe e-mail e senha." });
        }

        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Usuário ou senha incorretos." });
        }

        const usuario = result.rows[0];
        let senhaValida = false;

        // Suporta tanto senha com hash bcrypt quanto senhas antigas em texto puro
        if (usuario.senha.startsWith('$2a$') || usuario.senha.startsWith('$2b$')) {
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } else if (usuario.senha === senha) {
            senhaValida = true;
            // Migra silenciosamente para hash seguro
            const novoHash = await bcrypt.hash(senha, 10);
            await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novoHash, usuario.id]);
        }

        if (senhaValida) {
            res.json({
                message: "Sucesso!",
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    cargo: usuario.cargo || 'Cientista'
                }
            });
        } else {
            res.status(401).json({ error: "Usuário ou senha incorretos." });
        }
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- REAGENTES (PRODUTOS QUÍMICOS) ---
app.get('/reagentes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   COALESCE(SUM(l.quantidade_atual), 0) AS estoque_total
            FROM reagentes r
            LEFT JOIN lotes l ON l.reagente_id = r.id
            GROUP BY r.id
            ORDER BY r.categoria ASC, r.nome ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar reagentes:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/reagentes', async (req, res) => {
    try {
        const { nome, cas_number, unidade_base, estoque_minimo, formula_molecular, grau_pureza, orgao_regulador, localizacao } = req.body;
        if (!nome || !unidade_base) {
            return res.status(400).json({ error: "Nome e unidade base são obrigatórios." });
        }

        const query = `
            INSERT INTO reagentes (nome, cas_number, unidade_base, estoque_minimo, formula_molecular, grau_pureza, orgao_regulador, localizacao)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const result = await pool.query(query, [
            nome,
            cas_number || null,
            unidade_base,
            estoque_minimo || 0,
            formula_molecular || null,
            grau_pureza || 'P.A.',
            orgao_regulador || 'Nenhum',
            localizacao || 'Bancada'
        ]);

        res.status(201).json({ message: "Reagente cadastrado com sucesso!", reagente: result.rows[0] });
    } catch (err) {
        console.error("Erro ao cadastrar reagente:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- ESTOQUE DE LOTES COM RASTREABILIDADE ---
app.get('/estoque', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, 
                   r.nome, 
                   r.unidade_base, 
                   r.estoque_minimo, 
                   r.cas_number, 
                   r.formula_molecular, 
                   r.grau_pureza, 
                   r.orgao_regulador, 
                   r.localizacao,
                   (l.data_validade - CURRENT_DATE) AS dias_para_vencer
            FROM lotes l
            JOIN reagentes r ON r.id = l.reagente_id
            ORDER BY l.data_validade ASC, l.numero_lote ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar estoque:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- CADASTRAR NOVO LOTE (ENTRADA) ---
app.post('/novo-lote', async (req, res) => {
    try {
        const {
            reagente_id,
            numero_lote,
            quantidade_atual,
            data_validade,
            data_fabricacao,
            fornecedor,
            usuario_nome
        } = req.body;

        if (!reagente_id || !numero_lote || !quantidade_atual || !data_validade) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios do lote." });
        }

        const qtdNum = Number(quantidade_atual);
        if (isNaN(qtdNum) || qtdNum <= 0) {
            return res.status(400).json({ error: "A quantidade deve ser um número maior que zero." });
        }

        let dataIso = String(data_validade).trim();
        if (dataIso.includes('/')) {
            const partes = dataIso.split('/');
            if (partes.length === 3) {
                dataIso = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
        }

        // Validação estrita de data de validade (impede anos impossíveis como 111111)
        const parsedDate = new Date(dataIso);
        const anoValidade = parsedDate.getFullYear();
        if (isNaN(anoValidade) || anoValidade < 2024 || anoValidade > 2040) {
            return res.status(400).json({ error: "Data de validade inválida! O ano deve estar entre 2024 e 2040." });
        }

        // 1. Cadastra o lote
        const queryLote = `
            INSERT INTO lotes (reagente_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, data_fabricacao, fornecedor, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ativo') 
            RETURNING *`;

        const resultLote = await pool.query(queryLote, [
            reagente_id,
            numero_lote,
            quantidade_atual,
            quantidade_atual,
            dataIso,
            data_fabricacao || null,
            fornecedor || 'Não informado'
        ]);

        const loteCriado = resultLote.rows[0];

        // 2. Busca o nome do reagente para o log de auditoria
        const regResult = await pool.query('SELECT nome, unidade_base FROM reagentes WHERE id = $1', [reagente_id]);
        const nomeReagente = regResult.rows[0]?.nome || 'Reagente';
        const unidade = regResult.rows[0]?.unidade_base || 'un';

        // 3. Registra na tabela de movimentações (Audit Trail)
        await pool.query(`
            INSERT INTO movimentacoes (lote_id, numero_lote, reagente_nome, tipo, quantidade, unidade, motivo, usuario_nome)
            VALUES ($1, $2, $3, 'ENTRADA', $4, $5, $6, $7)
        `, [
            loteCriado.id,
            numero_lote,
            nomeReagente,
            quantidade_atual,
            unidade,
            `Entrada inicial de lote. Fornecedor: ${fornecedor || 'Geral'}`,
            usuario_nome || 'Cientista'
        ]);

        res.status(201).json({ message: "Lote cadastrado com sucesso e registrado na auditoria!", lote: loteCriado });
    } catch (err) {
        console.error("Erro ao inserir lote:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- MARCAR ABERTURA DE FRASCO (REGULAMENTAÇÃO ANVISA/BPF) ---
app.put('/marcar-abertura/:lote', async (req, res) => {
    try {
        const { lote } = req.params;
        const { usuario_nome } = req.body;
        const hoje = new Date().toISOString().split('T')[0];

        const result = await pool.query(`
            UPDATE lotes 
            SET data_abertura = $1 
            WHERE numero_lote = $2 
            RETURNING *
        `, [hoje, lote]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Lote não encontrado." });
        }

        // Log de auditoria
        await pool.query(`
            INSERT INTO movimentacoes (lote_id, numero_lote, reagente_nome, tipo, quantidade, unidade, motivo, usuario_nome)
            VALUES ($1, $2, 'Frasco', 'ABERTURA', 0, '-', 'Primeira abertura de frasco no laboratório', $3)
        `, [result.rows[0].id, lote, usuario_nome || 'Cientista']);

        res.json({ message: "Data de abertura registrada com sucesso!", data_abertura: hoje });
    } catch (err) {
        console.error("Erro ao marcar abertura:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- DAR BAIXA NO ESTOQUE (USO OU DESCARTE COM AUDITORIA) ---
app.put('/baixar-estoque', async (req, res) => {
    try {
        const { numero_lote, quantidade_usada, motivo, usuario_nome, tipo_movimento } = req.body;

        if (!numero_lote || !quantidade_usada || quantidade_usada <= 0) {
            return res.status(400).json({ error: "Informe o lote e uma quantidade válida." });
        }

        // 1. Busca dados atuais do lote e reagente
        const buscaLote = await pool.query(`
            SELECT l.*, r.nome AS reagente_nome, r.unidade_base
            FROM lotes l
            JOIN reagentes r ON r.id = l.reagente_id
            WHERE l.numero_lote = $1
        `, [numero_lote]);

        if (buscaLote.rows.length === 0) {
            return res.status(404).json({ error: "Lote não encontrado no laboratório." });
        }

        const loteAtual = buscaLote.rows[0];

        if (Number(loteAtual.quantidade_atual) < Number(quantidade_usada)) {
            return res.status(400).json({
                error: `Quantidade insuficiente! Saldo atual do lote: ${loteAtual.quantidade_atual} ${loteAtual.unidade_base}.`
            });
        }

        // 2. Atualiza saldo
        const queryUpdate = `
            UPDATE lotes
            SET quantidade_atual = quantidade_atual - $1,
                status = CASE WHEN (quantidade_atual - $1) <= 0 THEN 'esgotado' ELSE 'ativo' END
            WHERE numero_lote = $2
            RETURNING *`;

        const resultUpdate = await pool.query(queryUpdate, [quantidade_usada, numero_lote]);

        // 3. Registra auditoria
        const tipoFinal = tipo_movimento || 'CONSUMO';
        const motivoFinal = motivo || 'Análise de rotina laboratorial';

        await pool.query(`
            INSERT INTO movimentacoes (lote_id, numero_lote, reagente_nome, tipo, quantidade, unidade, motivo, usuario_nome)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            loteAtual.id,
            numero_lote,
            loteAtual.reagente_nome,
            tipoFinal,
            quantidade_usada,
            loteAtual.unidade_base,
            motivoFinal,
            usuario_nome || 'Cientista'
        ]);

        res.json({
            message: "Baixa registrada com sucesso na trilha de auditoria!",
            lote: resultUpdate.rows[0]
        });
    } catch (err) {
        console.error("Erro ao dar baixa:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- EXCLUIR LOTE ---
app.delete('/excluir-lote/:lote', async (req, res) => {
    try {
        const { lote } = req.params;
        const usuario_nome = req.query.usuario || 'Cientista';

        const busca = await pool.query(`
            SELECT l.*, r.nome AS reagente_nome, r.unidade_base 
            FROM lotes l 
            JOIN reagentes r ON r.id = l.reagente_id 
            WHERE l.numero_lote = $1
        `, [lote]);

        if (busca.rows.length > 0) {
            const item = busca.rows[0];
            await pool.query(`
                INSERT INTO movimentacoes (lote_id, numero_lote, reagente_nome, tipo, quantidade, unidade, motivo, usuario_nome)
                VALUES ($1, $2, $3, 'EXCLUSAO', $4, $5, 'Lote excluído do sistema pelo usuário', $6)
            `, [item.id, lote, item.reagente_nome, item.quantidade_atual, item.unidade_base, usuario_nome]);
        }

        await pool.query('DELETE FROM lotes WHERE numero_lote = $1', [lote]);
        res.json({ message: "Lote excluído com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir lote:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- AUDITORIA / RASTREABILIDADE (MOVIMENTAÇÕES) ---
app.get('/movimentacoes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM movimentacoes 
            ORDER BY criado_em DESC 
            LIMIT 150
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar histórico:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- RELATÓRIO SIPROQUIM 2 (POLÍCIA FEDERAL) ---
app.get('/relatorio/siproquim', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id,
                r.nome,
                r.cas_number,
                r.unidade_base,
                r.orgao_regulador,
                COALESCE(SUM(l.quantidade_atual), 0) AS saldo_atual,
                COALESCE(SUM(l.quantidade_inicial), 0) AS total_entradas_historico
            FROM reagentes r
            LEFT JOIN lotes l ON l.reagente_id = r.id
            WHERE r.orgao_regulador = 'Polícia Federal'
            GROUP BY r.id
            ORDER BY r.nome
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao gerar relatório SIPROQUIM:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`🧪 Servidor MolarisStock Commercial v2.0 Online!`);
    console.log(`🌐 Porta: ${PORT}`);
    console.log(`🤖 Robô Cron Keep-Alive: Ativo (pings a cada 8 minutos)`);
    console.log(`🛡️ Compliance: PF (SIPROQUIM 2), Exército, ANVISA e 27 UFs`);
    console.log(`========================================================`);
});