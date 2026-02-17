const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function crawler() {
    let baseExistente = [];
    if (fs.existsSync('meu_indice.json')) {
        baseExistente = JSON.parse(fs.readFileSync('meu_indice.json'));
    }

    console.log("🚀 Iniciando rodada de 120 buscas...");

    // Exemplo: pegando links de uma lista de "sementes"
    const sementes = ['https://g1.globo.com', 'https://www.techtudo.com.br']; 
    
    for (let i = 0; i < 120; i++) {
        const urlAlvo = sementes[i % sementes.length];
        console.log(`[${i+1}/120] Indexando: ${urlAlvo}`);

        try {
            const { data } = await axios.get(urlAlvo);
            const $ = cheerio.load(data);
            
            $('a').each((idx, el) => {
                const titulo = $(el).text().trim();
                const link = $(el).attr('href');
                
                if (link && link.startsWith('http') && titulo.length > 15) {
                    if (!baseExistente.find(item => item.url === link)) {
                        baseExistente.push({ titulo, url: link, data: new Date() });
                    }
                }
            });
        } catch (e) {
            console.log("Pulei um link por erro.");
        }

        // O SEGREDO: Esperar 30 segundos
        await delay(30000); 
    }

    fs.writeFileSync('meu_indice.json', JSON.stringify(baseExistente, null, 2));
    console.log("✅ Rodada finalizada!");
}

crawler();
