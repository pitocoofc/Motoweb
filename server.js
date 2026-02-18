const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

let memoriaRAM = [];
let urlsVistasNaSessao = new Set(); // 🚀 BARREIRA ANTI-CLONE
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "pitocoofc";
const REPO_NAME = "Motoweb";

async function salvarNoGithub() {
    if (memoriaRAM.length === 0) return;
    console.log("📤 Enviando lote limpo para o GitHub...");
    try {
        const urlGit = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/meu_indice2.json`;
        let sha = "";
        let conteudoExistente = [];

        try {
            const res = await axios.get(urlGit, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
            sha = res.data.sha;
            conteudoExistente = JSON.parse(Buffer.from(res.data.content, 'base64').toString());
        } catch (e) { console.log("Criando novo arquivo de índice."); }

        // Junta com o que já existe, mas mantém as chaves consistentes
        const novoConteudo = [...conteudoExistente, ...memoriaRAM];
        const buffer = Buffer.from(JSON.stringify(novoConteudo, null, 2)).toString('base64');

        await axios.put(urlGit, {
            message: `🔄 Indexação limpa: +${memoriaRAM.length} novos links`,
            content: buffer,
            sha: sha
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        memoriaRAM = []; // Limpa a fila de envio
        // Nota: Não limpamos o urlsVistasNaSessao para ele não pegar o mesmo link na próxima hora
        console.log("✅ GitHub Atualizado!");
    } catch (err) {
        console.error("❌ Falha no push:", err.response?.data || err.message);
    }
}

async function iniciarRobo() {
    const sementes = ['https://g1.globo.com', 'https://www.techtudo.com.br', 'https://www.uol.com.br'];
    let primeiraRodada = true;

    while (true) {
        try {
            const urlSemente = sementes[Math.floor(Math.random() * sementes.length)];
            const { data } = await axios.get(urlSemente, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(data);
            
            let novosDestaRodada = 0;

            $('a').each((i, el) => {
                const titulo = $(el).text().trim();
                const link = $(el).attr('href');
                
                // 🛡️ SÓ ADICIONA SE FOR NOVIDADE REAL
                if (link?.startsWith('http') && titulo.length > 20 && !urlsVistasNaSessao.has(link)) {
                    urlsVistasNaSessao.add(link);
                    memoriaRAM.push({ titulo, url: link });
                    novosDestaRodada++;
                }
            });

            console.log(`🔎 Rodada finalizada: ${novosDestaRodada} novos links encontrados.`);

            if (primeiraRodada && memoriaRAM.length > 0) {
                console.log("🚀 Fazendo primeiro envio rápido...");
                await salvarNoGithub();
                primeiraRodada = false;
            }

        } catch (e) { console.log("⚠️ Erro ao coletar, tentando novamente em 30s..."); }
        
        await new Promise(res => setTimeout(res, 30000));
    }
}

iniciarRobo();
setInterval(salvarNoGithub, 3600000); // Salva de hora em hora

app.get('/', (req, res) => res.send(`Motor Ativo. Únicos hoje: ${urlsVistasNaSessao.size} | Na fila para o próximo commit: ${memoriaRAM.length}`));
app.listen(process.env.PORT || 3000);
