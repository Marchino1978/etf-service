// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { config } from './config.js';
import { runUpdateCycle, getAllQuotes, getQuote } from './store.js'; // aggiorniamo store.js per usare PG

const app = express();

// Endpoint REST
app.get('/quotes', async (req, res) => {
  try {
    const quotes = await getAllQuotes();
    res.json(quotes);
  } catch (err) {
    console.error("❌ Errore /quotes:", err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/quotes/:symbol', async (req, res) => {
  try {
    const q = await getQuote(req.params.symbol.toUpperCase());
    if (!q) return res.status(404).json({ error: 'not found' });
    res.json(q);
  } catch (err) {
    console.error("❌ Errore /quotes/:symbol:", err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Avvio server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server avviato su http://localhost:${port}`));

// Ciclo di aggiornamento periodico
setInterval(() => runUpdateCycle(console), config.updateIntervalMin * 60 * 1000);
runUpdateCycle(console);
