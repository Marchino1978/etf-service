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

// Endpoint di health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ Nuovo endpoint di keep-alive
app.get("/ping", (req, res) => {          // <-- aggiunto per cronjob leggero
  res.status(200).send("pong");           // <-- risponde sempre OK
});

// Endpoint ETF con gestione errori
app.get("/api/etf", (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};

    for (const symbol in allPrices) {
      enriched[symbol] = addDailyChange(symbol, allPrices[symbol]);
    }

    res.json(enriched);
  } catch (error) {
    // ✅ Gestione specifica errore 429
    if (error.response && error.response.status === 429) {   // <-- intercetta 429
      console.warn("Rate limit raggiunto, bypass con risposta OK"); // <-- log
      res.status(200).json({ warning: "429 Too Many Requests, dati non aggiornati" }); // <-- risponde comunque 200
    } else {
      res.status(500).json({ error: "Errore nel recupero ETF" });
    }
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
    // ✅ Gestione anche qui del 429
    if (error.response && error.response.status === 429) {   // <-- intercetta 429
      console.warn(`Rate limit per ${symbol}, bypass con risposta OK`); // <-- log
      res.status(200).json({ warning: "429 Too Many Requests, dati non aggiornati" }); // <-- risponde comunque 200
    } else {
      res.status(500).json({ error: "Errore nel recupero ETF" });
    }
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
