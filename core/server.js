// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPrice, getAllPrices } from "../core/store.js";
import { safeParse } from "../core/utils.js";
import "../core/updater.js";

// Ricostruisci __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 📄 Caricamento previousClose.json con log chiari
const prevPath = path.join(__dirname, "../data/previousClose.json");
let previousClose = {};

if (fs.existsSync(prevPath)) {
  try {
    const raw = fs.readFileSync(prevPath, "utf8");
    previousClose = JSON.parse(raw);
    console.log(
      `✅ previousClose.json caricato (${Object.keys(previousClose).length} simboli)`
    );
  } catch (err) {
    console.error("❌ Errore nel parsing di previousClose.json:", err.message);
  }
} else {
  console.warn("⚠️ Nessun previousClose.json trovato, dailyChange rimarrà vuoto");
}

// Endpoints di servizio
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Endpoint ETF: tutti i simboli
app.get("/api/etf", (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};

    for (const symbol in allPrices) {
      enriched[symbol] = addDailyChange(symbol, allPrices[symbol]);
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Endpoint ETF: singolo simbolo
app.get("/api/etf/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const price = getPrice(symbol);
    if (price) {
      res.json(addDailyChange(symbol, price));
    } else {
      res.status(404).json({ error: "ETF non trovato" });
    }
  } catch (error) {
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// ✅ Calcolo dailyChange usando "value" dal JSON e "price" dall'endpoint
function addDailyChange(symbol, price) {
  let dailyChange = "";
  if (previousClose[symbol]) {
    const prev = safeParse(previousClose[symbol].value);   // valore salvato
    const current = safeParse(price.price);                // prezzo attuale
    if (!isNaN(prev) && !isNaN(current)) {
      const diff = ((current - prev) / prev) * 100;
      dailyChange = diff.toFixed(2) + "%";
    }
  }
  return { ...price, dailyChange };
}

// Avvio server
app.listen(3000, () => {
  console.log("🚀 Server avviato su http://localhost:3000");
});
