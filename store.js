// store.js
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Client } = pkg;

// Funzione di utilità per aprire una connessione veloce
async function withClient(fn) {
  const client = new Client({ connectionString: process.env.PG_URI });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Restituisce tutte le quote
export async function getAllQuotes() {
  return await withClient(async (client) => {
    const res = await client.query("SELECT * FROM quotes ORDER BY symbol ASC");
    return res.rows;
  });
}

// Restituisce una singola quote per simbolo
export async function getQuote(symbol) {
  return await withClient(async (client) => {
    const res = await client.query("SELECT * FROM quotes WHERE symbol = $1", [symbol]);
    return res.rows[0] || null;
  });
}

// Ciclo di aggiornamento: inserisce/aggiorna i prezzi
export async function runUpdateCycle(logger = console) {
  await withClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL UNIQUE,
        price NUMERIC,
        updated TIMESTAMP DEFAULT NOW()
      )
    `);

    const tickers = ["SPY", "QQQ", "AAPL"];

    for (const symbol of tickers) {
      // Qui puoi sostituire con una chiamata API reale
      const price = (Math.random() * 1000).toFixed(2);

      await client.query(
        `INSERT INTO quotes(symbol, price, updated)
         VALUES($1, $2, NOW())
         ON CONFLICT (symbol)
         DO UPDATE SET price = EXCLUDED.price, updated = EXCLUDED.updated`,
        [symbol, price]
      );

      logger.log(`💾 Aggiornato ${symbol} a ${price}`);
    }
  });
}
