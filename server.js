import express from "express";
import fs from "fs";
import { getPrice, getAllPrices } from "./store.js";
import "./updater.js"; // <-- avvia subito l’updater che fa scraping periodico e aggiorna lo store

const app = express();

// Carica i valori di chiusura salvati da file (per calcolare dailyChange)
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

// Endpoint di keep-alive (ping leggero per cronjob)
app.get("/ping", (req, res) => {
  res.status(200).send("pong"); // <-- risponde sempre OK, non fa scraping
});

// Endpoint ETF: restituisce tutti i dati dallo store
// ⚠️ Importante: NON fa scraping diretto, legge solo i dati aggiornati da updater.js
app.get("/api/etf", (req, res) => {
  try {
    const allPrices = getAllPrices(); // <-- legge dallo store
    const enriched = {};

    for (const symbol in allPrices) {
      enriched[symbol] = addDailyChange(symbol, allPrices[symbol]);
    }

    res.json(enriched); // <-- risponde con snapshot aggiornato
  } catch (error) {
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Endpoint ETF singolo: restituisce un simbolo specifico dallo store
app.get("/api/etf/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const price = getPrice(symbol); // <-- legge dallo store
    if (price) {
      res.json(addDailyChange(symbol, price));
    } else {
      res.status(404).json({ error: "ETF non trovato" });
    }
  } catch (error) {
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Funzione per calcolare dailyChange rispetto al previousClose salvato
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

// Avvio server
app.listen(3000, () => {
  console.log("🚀 Server avviato su http://localhost:3000");
});
