// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPrice, getAllPrices } from "../core/store.js";
import { safeParse } from "../core/utils.js";
import "../core/updater.js";

// 👉 importa la nuova route market-status
import marketStatusRoute from "../core/marketStatus.js";
// 👉 importa la nuova route save-previous-close
import savePreviousCloseRoute from "../routes/savePreviousClose.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 📄 Caricamento previousClose.json con log chiari
const prevPath = path.join(__dirname, "../data/previousClose.json");
let previousClose = { timestamp: null, data: [] };

if (fs.existsSync(prevPath)) {
  try {
    const raw = fs.readFileSync(prevPath, "utf8");
    previousClose = JSON.parse(raw);
    console.log(
      `✅ previousClose.json caricato (${previousClose.data?.length || 0} simboli, timestamp ${previousClose.timestamp})`
    );
  } catch (err) {
    console.error("❌ Errore nel parsing di previousClose.json:", err.message);
  }
} else {
  console.info("ℹ️ previousClose.json non trovato all'avvio, verrà generato dall'updater");
}

// Endpoints di servizio
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// 📄 Endpoint per leggere direttamente previousClose.json
app.get("/api/previous-close", (req, res) => {
  try {
    if (!fs.existsSync(prevPath)) {
      return res.status(404).json({ error: "previousClose.json non trovato" });
    }
    const raw = fs.readFileSync(prevPath, "utf8");
    const data = JSON.parse(raw);
    res.json(data); // 👉 restituisce { timestamp, data: [...] }
  } catch (err) {
    console.error("❌ Errore lettura previousClose.json:", err.message);
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
  if (previousClose.data) {
    const prevObj = previousClose.data.find((item) => item.symbol === symbol);
    if (prevObj) {
      const prev = safeParse(prevObj.value);
      const current = safeParse(price.price);
      if (!isNaN(prev) && !isNaN(current)) {
        const diff = ((current - prev) / prev) * 100;
        dailyChange = diff.toFixed(2) + "%";
      }
    }
  }
  return { ...price, dailyChange };
}

// 👉 monta le route
app.use("/api", marketStatusRoute);
app.use("/api", savePreviousCloseRoute);

// Avvio server con porta configurabile
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
});
