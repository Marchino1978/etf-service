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

dotenv.config({ path: "./.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/ping", (req, res) => res.send("pong"));

/* -------------------------------------------------------
   /api/previous-close
   → restituisce SOLO l’ultimo snapshot per ogni simbolo
-------------------------------------------------------- */
app.get("/api/previous-close", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase non configurato" });
    }

    const { data, error } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date")
      .order("snapshot_date", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Nessun dato disponibile" });
    }

    const latestBySymbol = {};
    for (const row of data) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    return res.json(Object.values(latestBySymbol));
  } catch (err) {
    console.error("ERROR lettura previousClose:", err.message);
    res.status(500).json({ error: "Errore interno" });
  }
});

/* -------------------------------------------------------
   /api/etf
-------------------------------------------------------- */
app.get("/api/etf", async (req, res) => {
  try {
    const allPrices = getAllPrices();
    const enriched = {};
    for (const symbol in allPrices) {
      enriched[symbol] = await addDailyChange(symbol, allPrices[symbol]);
    }
    res.json(enriched);
  } catch (error) {
    console.error("ERROR /api/etf:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

/* -------------------------------------------------------
   /api/etf/:symbol
-------------------------------------------------------- */
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
    console.error("ERROR /api/etf/:symbol:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

/* -------------------------------------------------------
   addDailyChange → arricchisce i dati LS-TC con:
   - dailyChange
   - previousClose
   - previousDate
   - ISIN
-------------------------------------------------------- */
async function addDailyChange(symbol, price) {
  try {
    if (!supabase) {
      return {
        ...price,
        dailyChange: "N/A",
        previousClose: null,
        previousDate: null,
        ISIN: etfs[symbol]?.ISIN || "-"
      };
    }

    const current = parseFloat(price?.price ?? "NaN");
    if (Number.isNaN(current)) {
      return {
        ...price,
        dailyChange: "N/A",
        previousClose: null,
        previousDate: null,
        ISIN: etfs[symbol]?.ISIN || "-"
      };
    }

    const dailyChange = await calcDailyChange(symbol, current);

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .lt("snapshot_date", today)
      .not("close_value", "is", null)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (error) throw error;

    const prev = data?.[0]?.close_value ?? null;

    return {
      ...price,
      dailyChange: dailyChange === "N/A" ? "N/A" : Number(dailyChange).toFixed(2),
      previousClose: prev,
      previousDate: data?.[0]?.snapshot_date ?? null,
      ISIN: etfs[symbol]?.ISIN || "-"
    };
  } catch (err) {
    console.error("ERROR calcolo dailyChange:", err.message);
    return {
      ...price,
      dailyChange: "N/A",
      previousClose: null,
      previousDate: null,
      ISIN: etfs[symbol]?.ISIN || "-"
    };
  }
}

/* -------------------------------------------------------
   Routing aggiuntivo
-------------------------------------------------------- */
app.use("/api", marketStatusRoute);
app.use("/api", savePreviousCloseRoute);

/* -------------------------------------------------------
   Avvio server
-------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
