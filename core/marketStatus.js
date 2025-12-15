// core/marketStatus.js
import express from "express";
import fs from "fs";
import { etfs } from "./index.js";
import Holidays from "date-holidays";

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

function getPreviousClose(symbol) {
  try {
    const raw = fs.readFileSync("./data/previousClose.json", "utf8");
    const parsed = JSON.parse(raw);
    const entry = parsed[symbol];
    return entry ? entry.previousClose : null;
  } catch (err) {
    console.error("Errore lettura previousClose.json:", err);
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
          const prev = getPreviousClose(symbol);
          let dailyChange = "0.00 %"; // default con spazio
          if (result?.price && prev) {
            const diff = ((result.price - prev) / prev) * 100;
            dailyChange = diff.toFixed(2) + " %";
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
      const data = Object.entries(parsed).map(([symbol, { price, previousClose, date, label }]) => {
        let dailyChange = "0.00 %"; // default con spazio
        if (price && previousClose) {
          const prev = parseFloat(previousClose);
          const current = parseFloat(price);
          if (!isNaN(prev) && !isNaN(current)) {
            const diff = ((current - prev) / prev) * 100;
            dailyChange = diff.toFixed(2) + " %";
          }
        }
        return { symbol, label, price, previousClose, date, dailyChange };
      });
      values = { source: "previous-close", data };
    } catch (err) {
      console.error("Errore lettura previousClose.json:", err);
      values = { source: "previous-close", data: [] };
    }
  }

  res.json({
    datetime: now.toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
    status,
    open: marketOpen,   // 🔹 aggiunto campo booleano
    values
  });
});

export default router;
