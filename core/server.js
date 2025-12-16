// core/server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getPrice, getAllPrices } from "../core/store.js";
import "../core/updater.js";

import marketStatusRoute from "../core/marketStatus.js";
import savePreviousCloseRoute from "../routes/savePreviousClose.js";
import supabase from "./supabaseClient.js";
import { etfs } from "../core/index.js";
import { calcDailyChange } from "./utilsDailyChange.js";

// Carica variabili d'ambiente dalla root
dotenv.config({ path: "./.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Servi la cartella "public" per la pagina web (market.html)
app.use(express.static(path.join(__dirname, "../public")));

// Endpoints di servizio
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/ping", (req, res) => res.send("pong"));

// Endpoint per leggere previousClose da Supabase (ultimi 10 record globali)
app.get("/api/previous-close", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase non configurato" });
    }
    const { data, error } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(10);

    if (error) throw error;
    if (data && data.length > 0) {
      return res.json(data);
    }
    return res.status(404).json({ error: "Nessun dato disponibile" });
  } catch (err) {
    console.error("❌ Errore lettura previousClose:", err.message);
    res.status(500).json({ error: "Errore interno" });
  }
});

// Endpoint ETF: tutti i simboli
app.get("/api/etf", async (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};
    for (const symbol in allPrices) {
      enriched[symbol] = await addDailyChange(symbol, allPrices[symbol]);
    }
    res.json(enriched);
  } catch (error) {
    console.error("❌ Errore /api/etf:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Endpoint ETF: singolo simbolo
app.get("/api/etf/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const price = getPrice(symbol);
    if (price) {
      const enriched = await addDailyChange(symbol, price);
      res.json(enriched);
    } else {
      res.status(404).json({ error: "ETF non trovato" });
    }
  } catch (error) {
    console.error("❌ Errore /api/etf/:symbol:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Calcolo dailyChange: variazione rispetto all'ultimo record precedente disponibile
async function addDailyChange(symbol, price) {
  try {
    if (supabase) {
      // Data corrente (YYYY-MM-DD) — snapshot_date è di tipo DATE
      const currentDate = new Date().toISOString().slice(0, 10);

      // Prendi l'ultimo close precedente alla data corrente (esclude lo snapshot di oggi)
      const { data, error } = await supabase
        .from("previous_close")
        .select("close_value, snapshot_date")
        .eq("symbol", symbol)
        .lt("snapshot_date", currentDate) // esclude la data corrente
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;

      const prev = data?.[0]?.close_value ?? null;
      const current = parseFloat(price?.price ?? "NaN");

      const dailyChange = calcDailyChange(current, prev);

      return {
        ...price,
        dailyChange,                  // es. "2.35 %" o "— %", in base alla tua implementazione
        previousClose: prev,
        previousDate: data?.[0]?.snapshot_date ?? null,
        ISIN: etfs[symbol]?.ISIN || "-",
        url: etfs[symbol]?.url || null
      };
    }
  } catch (err) {
    console.error("❌ Errore calcolo dailyChange:", err.message);
  }
  return {
    ...price,
    dailyChange: "N/A",
    previousClose: null,
    previousDate: null,
    ISIN: etfs[symbol]?.ISIN || "-",
    url: etfs[symbol]?.url || null
  };
}

// monta le route
app.use("/api", marketStatusRoute);
app.use("/api", savePreviousCloseRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
});
