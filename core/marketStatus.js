// core/marketStatus.js
import express from "express";
import { etfs } from "./index.js";
import Holidays from "date-holidays";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carica variabili d'ambiente dalla root
dotenv.config({ path: "./.env" });

const router = express.Router();
const hd = new Holidays("IT");

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.info("✅ Supabase inizializzato");
} else {
  console.warn("⚠️ Supabase non configurato: controlla il file .env");
}

const MARKET_OPEN = { hour: 7, minute: 30 };
const MARKET_CLOSE = { hour: 23, minute: 0 };

function isMarketOpen(now) {
  if (hd.isHoliday(now)) return false;
  const day = now.getDay();
  if (day === 0 || day === 6) return false;

  const hour = parseInt(
    now.toLocaleString("it-IT", { timeZone: "Europe/Rome", hour: "numeric" })
  );
  const minute = parseInt(
    now.toLocaleString("it-IT", { timeZone: "Europe/Rome", minute: "numeric" })
  );

  if (hour < MARKET_OPEN.hour || (hour === MARKET_OPEN.hour && minute < MARKET_OPEN.minute)) {
    return false;
  }
  if (hour > MARKET_CLOSE.hour || (hour === MARKET_CLOSE.hour && minute >= MARKET_CLOSE.minute)) {
    return false;
  }
  return true;
}

// Recupera previousClose da Supabase
async function getPreviousClose(symbol) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("previous_close")
      .select("close_value")
      .eq("symbol", symbol)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.close_value ?? null;
  } catch (err) {
    console.error("❌ Errore lettura Supabase previousClose:", err.message);
    return null;
  }
}

router.get("/market-status", async (req, res) => {
  const now = new Date();
  const marketOpen = isMarketOpen(now);
  const status = marketOpen ? "APERTO" : "CHIUSO";

  let values;
  if (marketOpen) {
    try {
      const data = await Promise.all(
        Object.entries(etfs).map(async ([symbol, { fn, label }]) => {
          const result = await fn();
          const prev = await getPreviousClose(symbol);
          let dailyChange = "N/A";
          if (result?.price && prev !== null) {
            const diff = ((result.price - prev) / prev) * 100;
            dailyChange = diff.toFixed(2) + " %";
          }
          return { symbol, label, ...result, previousClose: prev, dailyChange };
        })
      );
      values = { source: "etf", data };
    } catch (err) {
      console.error("❌ Errore scraper:", err.message);
      values = { source: "etf", data: [] };
    }
  } else {
    if (!supabase) {
      values = { source: "previous-close", data: [] };
    } else {
      try {
        const { data, error } = await supabase
          .from("previous_close")
          .select("symbol, close_value, snapshot_date, label");

        if (error) throw error;

        const enriched = data.map(({ symbol, close_value, snapshot_date, label }) => ({
          symbol,
          label,
          price: close_value,
          previousClose: close_value,
          date: snapshot_date,
          dailyChange: "N/A"
        }));

        values = { source: "previous-close", data: enriched };
      } catch (err) {
        console.error("❌ Errore lettura Supabase previousClose:", err.message);
        values = { source: "previous-close", data: [] };
      }
    }
  }

  res.json({
    datetime: now.toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
    status,
    open: marketOpen,
    values
  });
});

export default router;
