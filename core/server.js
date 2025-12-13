// server.js
import express from "express";
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

    return res.status(404).json({ error: "Nessun dato disponibile" });
  } catch (err) {
    console.error("Errore lettura previousClose:", err.message);
    res.status(500).json({ error: "Errore interno" });
  }
});

// Endpoint ETF: tutti i simboli (pretty print)
app.get("/api/etf", async (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};

    for (const symbol in allPrices) {
      enriched[symbol] = await addDailyChange(symbol, allPrices[symbol]);
    }

    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(enriched, null, 2));
  } catch (error) {
    console.error("Errore /api/etf:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Endpoint ETF: singolo simbolo (pretty print)
app.get("/api/etf/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const price = getPrice(symbol);
    if (price) {
      const enriched = await addDailyChange(symbol, price);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(enriched, null, 2));
    } else {
      res.status(404).json({ error: "ETF non trovato" });
    }
  } catch (error) {
    console.error("Errore /api/etf/:symbol:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Calcolo dailyChange e aggiunta previousClose da Supabase
async function addDailyChange(symbol, price) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("previous_close")
        .select("close_value")
        .eq("symbol", symbol)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;

      const prev = data?.[0]?.close_value ?? null;
      const current = parseFloat(price?.price ?? "NaN");

      if (prev !== null && !isNaN(prev) && !isNaN(current)) {
        const diff = ((current - prev) / prev) * 100;
        return { ...price, dailyChange: diff.toFixed(2) + "%", previousClose: prev };
      }
    }
  } catch (err) {
    console.error("Errore calcolo dailyChange:", err.message);
  }
  return { ...price, dailyChange: "0.00%", previousClose: "-" };
}

// monta le route
app.use("/api", marketStatusRoute);
app.use("/api", savePreviousCloseRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
