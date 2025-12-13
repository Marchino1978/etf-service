// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPrice, getAllPrices } from "../core/store.js";
import "../core/updater.js";

import marketStatusRoute from "../core/marketStatus.js";
import savePreviousCloseRoute from "../routes/savePreviousClose.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const prevPath = path.join(__dirname, "../data/previousClose.json");

// Endpoints di servizio
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

// Endpoint per leggere direttamente previousClose.json
app.get("/api/previous-close", (req, res) => {
  try {
    if (!fs.existsSync(prevPath)) {
      return res.status(404).json({ error: "previousClose.json non trovato" });
    }
    const raw = fs.readFileSync(prevPath, "utf8");
    const data = JSON.parse(raw);
    res.json(data);   // <-- niente pretty print
  } catch (err) {
    console.error("Errore lettura previousClose.json:", err.message);
    res.status(500).json({ error: "Errore interno" });
  }
});

// Endpoint ETF: tutti i simboli
app.get("/api/etf", (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};

    for (const symbol in allPrices) {
      enriched[symbol] = addDailyChange(symbol, allPrices[symbol]);
    }

    res.json(enriched);   // <-- niente pretty print
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
      res.json(addDailyChange(symbol, price));   // <-- niente pretty print
    } else {
      res.status(404).json({ error: "ETF non trovato" });
    }
  } catch (error) {
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Calcolo dailyChange usando "previousClose" dal JSON e "price" dall'endpoint
function addDailyChange(symbol, price) {
  try {
    const raw = fs.readFileSync(prevPath, "utf8");
    const parsed = JSON.parse(raw);
    const entry = parsed[symbol];
    if (entry && entry.previousClose && price.price) {
      const prev = parseFloat(entry.previousClose);
      const current = parseFloat(price.price);
      if (!isNaN(prev) && !isNaN(current)) {
        const diff = ((current - prev) / prev) * 100;
        return { ...price, dailyChange: diff.toFixed(2) + "%" };
      }
    }
  } catch (err) {
    console.error("Errore calcolo dailyChange:", err.message);
  }
  return { ...price, dailyChange: "" };
}

// monta le route
app.use("/api", marketStatusRoute);
app.use("/api", savePreviousCloseRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
