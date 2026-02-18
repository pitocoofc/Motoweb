const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

let memoriaRAM = [];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "pitocoofc";
const REPO_NAME = "Motoweb";

async function salvarNoGithub() {
    if (memoriaRAM.length === 0) return;
    console.log("📤 Enviando lote para o GitHub...");
    try {
        const urlGit = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/meu_indice.json`;
        let sha = "";
        let conteudoExistente = [];

        try {
            const res = await axios.get(urlGit, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
            sha = res.data.sha;
            conteudoExistente = JSON.parse(Buffer.from(res.data.content, 'base64').toString());
        } catch (e) { console.log("Criando novo arquivo de índice."); }

        const novoConteudo = [...conteudoExistente, ...memoriaRAM];
        const buffer = Buffer.from(JSON.stringify(novoConteudo, null, 2)).toString('base64');

        await axios.put(urlGit, {
            message: `🔄 Indexação automática: +${memoriaRAM.length} links`,
            content: buffer,
            sha: sha
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        memoriaRAM = []; 
        console.log("✅ GitHub Atualizado!");
    } catch (err) {
        console.error("❌ Falha no push:", err.response?.data || err.message);
    }
}

async function iniciarRobo() {
    const sementes = ['https://g1.globo.com', 'https://www.techtudo.com.br'];
    let primeiraRodada = true;

    while (true) {
        try {
            const url = sementes[Math.floor(Math.random() * sementes.length)];
            const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(data);
            
            $('a').each((i, el) => {
                const titulo = $(el).text().trim();
                const link = $(el).attr('href');
                if (link?.startsWith('http') && titulo.length > 15) {
                    memoriaRAM.push({ titulo, url: link, data: new Date() });
                }
            });

            // Se for a primeira vez, envia pro GitHub após 5 segundos
            if (primeiraRodada) {
                console.log("🚀 Primeira indexação rápida detectada!");
                await new Promise(res => setTimeout(res, 5000));
                await salvarNoGithub();
                primeiraRodada = false;
            }

        } catch (e) { console.log("Erro ao coletar links."); }
        
        // Modo de espera: 30 segundos entre as coletas para não ser banido dos sites
        await new Promise(res => setTimeout(res, 30000));
    }
}

iniciarRobo();
// Salva o acumulado no GitHub a cada 1 hora
setInterval(salvarNoGithub, 3600000);

app.get('/', (req, res) => res.send(`Motor Ativo. Links na fila: ${memoriaRAM.length}`));
app.listen(process.env.PORT || 3000);
