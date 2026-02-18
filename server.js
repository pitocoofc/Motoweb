const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');

const app = express();

// Puxa a chave do MongoDB das configurações do Render (Segurança!)
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 Banco de Dados Conectado!"))
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));

// Estrutura para salvar os links
const Pagina = mongoose.model('Pagina', {
    titulo: String,
    url: { type: String, unique: true },
    dataIndexacao: { type: Date, default: Date.now }
});

// O ROBÔ: Indexa um site a cada 30 segundos
async function iniciarRobo() {
    const sementes = [
        'https://g1.globo.com', 
        'https://www.techtudo.com.br',
        'https://www.uol.com.br'
    ];
    let i = 0;

    while (true) {
        try {
            const url = sementes[i % sementes.length];
            console.log(`🕷️  Garimpando: ${url}`);
            
            const { data } = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(data);
            
            let contagem = 0;
            const linksParaProcessar = [];

            $('a').each((idx, el) => {
                const titulo = $(el).text().trim();
                const link = $(el).attr('href');
                
                if (link && link.startsWith('http') && titulo.length > 15) {
                    linksParaProcessar.push({ titulo, url: link });
                }
            });

            // Salva um por um para não dar erro se o link já existir
            for (const item of linksParaProcessar) {
                try {
                    await Pagina.create(item);
                    contagem++;
                } catch (e) { /* Link duplicado, apenas ignora */ }
            }

            console.log(`✅ Rodada finalizada. +${contagem} novos links no banco.`);
        } catch (e) {
            console.log("⚠️ Site lento ou bloqueado, pulando...");
        }
        
        i++;
        // Espera 30 segundos (conforme sua ideia de 120/hora)
        await new Promise(res => setTimeout(res, 30000));
    }
}

// Inicia o robô assim que o servidor subir
iniciarRobo();

// Rota de busca para o seu site (Frontend)
app.get('/buscar', async (req, res) => {
    const termo = req.query.q;
    if (!termo) return res.json([]);

    try {
        // Busca resultados que contenham a palavra (ignora maiúsculas/minúsculas)
        const resultados = await Pagina.find({
            titulo: { $regex: termo, $options: 'i' }
        }).limit(20);
        
        res.json(resultados);
    } catch (err) {
        res.status(500).json({ erro: "Erro na busca" });
    }
});

// Rota padrão para saber se está online
app.get('/', (req, res) => res.send("🚀 Motor de Busca Rodando!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Servidor na porta ${PORT}`));
