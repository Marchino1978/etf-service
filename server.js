import express from "express";
import fs from "fs";
import { getPrice, getAllPrices } from "./store.js";
import "./updater.js"; // <-- avvia subito l’updater

const app = express();

// Carica i valori di chiusura salvati
let previousClose = {};
try {
  previousClose = JSON.parse(fs.readFileSync("./previousClose.json", "utf8"));
} catch (err) {
  console.log("⚠️ Nessun previousClose.json trovato, dailyChange rimarrà vuoto");
}

// Endpoint di health check già presente
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ Nuovo endpoint di keep-alive
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/api/etf", (req, res) => {
  const allPrices = getAllPrices();
  const enriched = {};

  for (const symbol in allPrices) {
    enriched[symbol] = addDailyChange(symbol, allPrices[symbol]);
  }

  res.json(enriched);
});

app.get("/api/etf/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const price = getPrice(symbol);
  if (price) {
    res.json(addDailyChange(symbol, price));
  } else {
    res.status(404).json({ error: "ETF non trovato" });
  }
});

function addDailyChange(symbol, price) {
  let dailyChange = "";
  if (previousClose[symbol]) {
    const prev = parseFloat(previousClose[symbol].previousClose.replace(",", "."));
    const mid = parseFloat(price.mid.replace(",", "."));
    if (!isNaN(prev) && !isNaN(mid)) {
      const diff = ((mid - prev) / prev) * 100;
      dailyChange = diff.toFixed(2) + "%";
    }
  }
  return { ...price, dailyChange };
}

app.listen(3000, () => {
  console.log("🚀 Server avviato su http://localhost:3000");
});
