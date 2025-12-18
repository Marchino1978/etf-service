// core/marketStatus.js
import express from "express";
import { etfs } from "./index.js";
import Holidays from "date-holidays";
import supabase from "./supabaseClient.js";
import { calcDailyChange } from "./utilsDailyChange.js";
import { logError } from "./logger.js";

const router = express.Router();
const hd = new Holidays("IT");

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
    logError(`Errore lettura Supabase previousClose: ${err.message}`);
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

          // 🔎 dailyChange già stringa con 2 decimali
          const dailyChange = await calcDailyChange(symbol, result?.price);

          return {
            symbol,
            label,
            // 🔎 Arrotondamento a 2 decimali SOLO in output
            price: result?.price ? Number(result.price).toFixed(2) : null,
            bid: result?.bid ? Number(result.bid).toFixed(2) : null,
            ask: result?.ask ? Number(result.ask).toFixed(2) : null,
            previousClose: prev ? Number(prev).toFixed(2) : null,
            dailyChange
          };
        })
      );
      values = { source: "etf", data };
    } catch (err) {
      logError(`Errore scraper: ${err.message}`);
      values = { source: "etf", data: [] };
    }
  } else {
    try {
      if (!supabase) {
        values = { source: "previous-close", data: [] };
      } else {
        const { data, error } = await supabase
          .from("previous_close")
          .select("symbol, close_value, snapshot_date, label");

        if (error) throw error;

        const enriched = data.map(({ symbol, close_value, snapshot_date, label }) => ({
          symbol,
          label,
          price: close_value ? Number(close_value).toFixed(2) : null,
          previousClose: close_value ? Number(close_value).toFixed(2) : null,
          date: snapshot_date,
          dailyChange: "N/A"
        }));

        values = { source: "previous-close", data: enriched };
      }
    } catch (err) {
      logError(`Errore lettura Supabase previousClose: ${err.message}`);
      values = { source: "previous-close", data: [] };
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
