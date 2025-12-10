// core/marketStatus.js
import express from "express";
import fs from "fs";
import { etfs } from "./index.js";   // importa la mappa ETF centralizzata
import Holidays from "date-holidays";

const router = express.Router();
const hd = new Holidays("IT");

// Orari di apertura/chiusura mercato (ora locale CET)
const MARKET_OPEN = { hour: 7, minute: 30 };
const MARKET_CLOSE = { hour: 23, minute: 0 };

function isMarketOpen(now) {
  if (hd.isHoliday(now)) return false;

  const day = now.getDay(); // 0=dom, 6=sab
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

// Helper per leggere previousClose.json
function getPreviousClose(symbol) {
  try {
    const raw = fs.readFileSync("./data/previousClose.json", "utf8");
    const parsed = JSON.parse(raw);
    const entry = Array.isArray(parsed)
      ? parsed.find(item => item.symbol === symbol)
      : parsed[symbol];
    return entry ? entry.value : null;
  } catch (err) {
    console.error("Errore lettura previousClose.json:", err);
    return null;
  }
}

router.get("/market-status", async (req, res) => {
  const now = new Date();
  const status = isMarketOpen(now) ? "APERTO" : "CHIUSO";

  let values;
  if (status === "APERTO") {
    try {
      const data = await Promise.all(
        Object.entries(etfs).map(async ([symbol, { fn, label }]) => {
          const result = await fn(); // deve contenere almeno lastPrice
          const prev = getPreviousClose(symbol);
          let dailyChange = null;
          if (result?.lastPrice && prev) {
            dailyChange = ((result.lastPrice - prev) / prev * 100).toFixed(2);
          }
          return { symbol, label, ...result, dailyChange };
        })
      );
      values = { source: "etf", data };
    } catch (err) {
      console.error("Errore scraper:", err);
      values = { source: "etf", data: [] };
    }
  } else {
    try {
      const raw = fs.readFileSync("./data/previousClose.json", "utf8");
      const parsed = JSON.parse(raw);
      const data = Array.isArray(parsed)
        ? parsed
        : Object.entries(parsed).map(([symbol, { value, date }]) => ({
            symbol,
            value,
            date
          }));
      values = { source: "previous-close", data };
    } catch (err) {
      console.error("Errore lettura previousClose.json:", err);
      values = { source: "previous-close", data: [] };
    }
  }

  res.json({
    datetime: now.toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
    status,
    values
  });
});

export default router;
