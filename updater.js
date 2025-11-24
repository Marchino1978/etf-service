// updater.js
import dotenv from 'dotenv';
import pkg from 'pg';
import fetch from 'node-fetch';
import { isMarketOpen, config } from './config.js';

dotenv.config();
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.PG_URI,
});

async function main() {
  try {
    await client.connect();
    console.log("✅ Connesso a PostgreSQL");

    // Crea tabella se non esiste
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL UNIQUE,
        price NUMERIC,
        updated TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const { symbol } of config.tickers) {
      if (isMarketOpen(symbol)) {
        // Qui puoi sostituire con una chiamata API reale
        const price = (Math.random() * 1000).toFixed(2);

        await client.query(
          `INSERT INTO quotes(symbol, price, updated)
           VALUES($1, $2, NOW())
           ON CONFLICT (symbol)
           DO UPDATE SET price = EXCLUDED.price, updated = EXCLUDED.updated`,
          [symbol, price]
        );

        console.log(`💾 Aggiornato ${symbol} a ${price}`);
      } else {
        console.log(`⏸ Mercato chiuso per ${symbol}, nessun aggiornamento`);
      }
    }

    const res = await client.query("SELECT * FROM quotes ORDER BY symbol ASC");
    console.log("📊 Dati in tabella:", res.rows);

  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    await client.end();
  }
}

main();

