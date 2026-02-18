const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

let indiceLocal = []; // Para testes, vamos manter na memória

// --- PARTE 1: O ROBÔ (Roda em segundo plano) ---
async function iniciarRobo() {
    const sementes = ['https://g1.globo.com', 'https://www.techtudo.com.br'];
    let i = 0;

    while (true) { // Loop infinito
        try {
            const url = sementes[i % sementes.length];
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);
            
            $('a').each((idx, el) => {
                const titulo = $(el).text().trim();
                const link = $(el).attr('href');
                if (link && link.startsWith('http') && titulo.length > 15) {
                    if (!indiceLocal.find(item => item.url === link)) {
                        indiceLocal.push({ titulo, url: link });
                    }
                }
            });
            console.log(`✅ Indexado: ${url}. Total no banco: ${indiceLocal.length}`);
        } catch (e) { console.log("Erro no bot"); }
        
        i++;
        await new Promise(res => setTimeout(res, 30000)); // Espera 30 segundos
    }
}
iniciarRobo();

// --- PARTE 2: A API DE BUSCA ---
app.get('/buscar', (req, res) => {
    const q = req.query.q.toLowerCase();
    const resultados = indiceLocal.filter(item => item.titulo.toLowerCase().includes(q));
    res.json(resultados);
});

app.get('/', (req, res) => res.send("Motor de Busca Online!"));

app.listen(process.env.PORT || 3000);
