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

let previousClose = {};
try {
  previousClose = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/previousClose.json"), "utf8")
  );
} catch (err) {
  console.log("⚠️ Nessun previousClose.json trovato, dailyChange rimarrà vuoto");
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

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

// ✅ Calcolo dailyChange usando "value" dal JSON
function addDailyChange(symbol, price) {
  let dailyChange = "";
  if (previousClose[symbol]) {
    const prev = safeParse(previousClose[symbol].value); // valore salvato
    const current = safeParse(price.price);              // <-- usa price
    if (!isNaN(prev) && !isNaN(current)) {
      const diff = ((current - prev) / prev) * 100;
      dailyChange = diff.toFixed(2) + "%";
    }
  }
  return { ...price, dailyChange };
}

app.listen(3000, () => {
  console.log("🚀 Server avviato su http://localhost:3000");
});
