// updater.js
import dotenv from 'dotenv';
import pkg from 'pg';
import fetch from 'node-fetch';

dotenv.config();
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.PG_URI,
});

async function main() {
  try {
    await client.connect();
    console.log("✅ Connesso a PostgreSQL");

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
      const price = (Math.random() * 1000).toFixed(2);

      await client.query(
        `INSERT INTO quotes(symbol, price, updated)
         VALUES($1, $2, NOW())
         ON CONFLICT (symbol)
         DO UPDATE SET price = EXCLUDED.price, updated = EXCLUDED.updated`,
        [symbol, price]
      );

      console.log(`💾 Aggiornato ${symbol} a ${price}`);
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


