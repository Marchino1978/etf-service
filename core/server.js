// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPrice, getAllPrices } from "../core/store.js";
import "../core/updater.js";

import marketStatusRoute from "../core/marketStatus.js";
import savePreviousCloseRoute from "../routes/savePreviousClose.js";
import { createClient } from "@supabase/supabase-js"; // NEW

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const prevPath = path.join(__dirname, "../data/previousClose.json");

// Supabase client (valori da Environment)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// 🔹 Servi la cartella "public" per la pagina web (market.html)
app.use(express.static(path.join(__dirname, "../public")));

// Endpoints di servizio
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

// Endpoint per leggere previousClose (prima da Supabase, fallback su file)
app.get("/api/previous-close", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("previous_close")
        .select("symbol, close_value, snapshot_date")
        .order("snapshot_date", { ascending: false })
        .limit(10); // ultimi 10 record

      if (error) throw error;
      if (data && data.length > 0) {
        return res.json(data);
      }
    }

    // fallback: lettura da file JSON
    if (!fs.existsSync(prevPath)) {
      return res.status(404).json({ error: "previousClose.json non trovato" });
    }
    const raw = fs.readFileSync(prevPath, "utf8");
    const parsed = JSON.parse(raw);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error("Errore lettura previousClose:", err.message);
    res.status(500).json({ error: "Errore interno" });
  }
});

// Endpoint ETF: tutti i simboli (pretty print)
app.get("/api/etf", (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};

    for (const symbol in allPrices) {
      enriched[symbol] = addDailyChange(symbol, allPrices[symbol]);
    }

    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(enriched, null, 2));
  } catch (error) {
    console.error("Errore /api/etf:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Endpoint ETF: singolo simbolo (pretty print)
app.get("/api/etf/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const price = getPrice(symbol);
    if (price) {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(addDailyChange(symbol, price), null, 2));
    } else {
      res.status(404).json({ error: "ETF non trovato" });
    }
  } catch (error) {
    console.error("Errore /api/etf/:symbol:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Calcolo dailyChange usando "previousClose" dal JSON e "price" dall'endpoint
function addDailyChange(symbol, price) {
  try {
    const raw = fs.readFileSync(prevPath, "utf8");
    const parsed = JSON.parse(raw);
    const entry = parsed[symbol];

    let prev = entry?.previousClose ? parseFloat(entry.previousClose) : null;
    let current = price?.price ? parseFloat(price.price) : null;

    if ((current === null || isNaN(current)) && entry?.price) {
      current = parseFloat(entry.price);
    }

    if (prev !== null && !isNaN(prev) && current !== null && !isNaN(current)) {
      const diff = ((current - prev) / prev) * 100;
      return { ...price, dailyChange: diff.toFixed(2) + "%" };
    }
  } catch (err) {
    console.error("Errore calcolo dailyChange:", err.message);
  }
  return { ...price, dailyChange: "0.00%" };
}

// monta le route
app.use("/api", marketStatusRoute);
app.use("/api", savePreviousCloseRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
