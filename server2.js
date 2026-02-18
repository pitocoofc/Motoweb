const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// --- CONFIGURAÇÕES CRÍTICAS ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "pitocoofc";
const REPO_NAME = "Motoweb";
const LIMITE_MB = 2; 

let memoriaRAM = [];
let urlsVistasGeral = new Set(); 
let volumeAtual = 1;

const sementesAvancadas = [
    'https://www.harvard.edu', 'https://www.mit.edu', 'https://www.stanford.edu',
    'https://www.ufmg.br', 'https://www.usp.br', 'https://en.wikipedia.org',
    'https://archive.org', 'https://news.ycombinator.com', 'https://dev.to',
    'https://medium.com', 'https://stackoverflow.com'
];

function formatarLink(link) {
    try {
        let url = new URL(link);
        url.hash = ""; 
        return url.href;
    } catch (e) { return null; }
}

async function salvarNoGithub() {
    if (memoriaRAM.length === 0) return;

    const nomeArquivo = `conhecimento_v${volumeAtual}.json`;
    console.log(`📦 Processando Volume ${volumeAtual}...`);

    try {
        const urlGit = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${nomeArquivo}`;
        let sha = "";
        let conteudoExistente = [];

        try {
            const res = await axios.get(urlGit, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
            sha = res.data.sha;
            conteudoExistente = JSON.parse(Buffer.from(res.data.content, 'base64').toString());
        } catch (e) { console.log(`Iniciando volume: ${nomeArquivo}`); }

        const novoConteudo = [...conteudoExistente, ...memoriaRAM];
        const tamanhoTotal = Buffer.byteLength(JSON.stringify(novoConteudo)) / (1024 * 1024);

        // Se o arquivo atual já está grande, o próximo lote irá para o próximo volume
        if (tamanhoTotal > LIMITE_MB) {
            console.log("⚠️ Limite de 2MB atingido para este arquivo.");
            volumeAtual++; 
        }

        const buffer = Buffer.from(JSON.stringify(novoConteudo, null, 2)).toString('base64');

        await axios.put(urlGit, {
            message: `📚 Conhecimento Vol ${volumeAtual} (+${memoriaRAM.length} links)`,
            content: buffer,
            sha: sha
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        memoriaRAM = []; 
        console.log(`✅ ${nomeArquivo} atualizado!`);

    } catch (err) {
        console.error("❌ Erro no Servidor 2:", err.response?.data || err.message);
    }
}

async function iniciarRobo() {
    let primeiraRodada = true; 

    while (true) {
        try {
            const alvo = sementesAvancadas[Math.floor(Math.random() * sementesAvancadas.length)];
            const { data } = await axios.get(alvo, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
            const $ = cheerio.load(data);
            
            let achados = 0;
            $('a').each((i, el) => {
                const titulo = $(el).text().trim();
                const linkBruto = $(el).attr('href');
                const linkLimpo = formatarLink(linkBruto);

                if (linkLimpo && linkLimpo.startsWith('http') && titulo.length > 25) {
                    if (!urlsVistasGeral.has(linkLimpo)) {
                        urlsVistasGeral.add(linkLimpo);
                        memoriaRAM.push({ titulo, url: linkLimpo, ref: alvo });
                        achados++;
                    }
                }
            });

            console.log(`💎 [Servidor 2] ${alvo}: +${achados} links únicos.`);

            if (primeiraRodada && memoriaRAM.length > 0) {
                console.log("⚡ Entrega rápida inicial...");
                await salvarNoGithub();
                primeiraRodada = false;
            }

        } catch (e) { console.log("⏳ Falha ao acessar semente, pulando..."); }

        await new Promise(res => setTimeout(res, 60000));
    }
}

// --- ATIVAÇÃO ---
iniciarRobo();
setInterval(salvarNoGithub, 1800000); // Tenta consolidar a cada 30 min

app.get('/', (req, res) => res.send(`Servidor 2 Ativo. Vol: ${volumeAtual} | Fila: ${memoriaRAM.length}`));
app.listen(process.env.PORT || 3001);
