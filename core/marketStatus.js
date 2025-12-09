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
  // Festività italiane
  if (hd.isHoliday(now)) return false;

  // Weekend
  const day = now.getDay(); // 0=dom, 6=sab
  if (day === 0 || day === 6) return false;

  const hour = now.getHours();
  const minute = now.getMinutes();

  // Apertura
  if (hour < MARKET_OPEN.hour || (hour === MARKET_OPEN.hour && minute < MARKET_OPEN.minute)) {
    return false;
  }

  // Chiusura
  if (hour > MARKET_CLOSE.hour || (hour === MARKET_CLOSE.hour && minute >= MARKET_CLOSE.minute)) {
    return false;
  }

  return true;
}

router.get("/market-status", async (req, res) => {
  // Usa ora locale CET
  const now = new Date();
  const status = isMarketOpen(now) ? "APERTO" : "CHIUSO";

  let values;
  if (status === "APERTO") {
    try {
      // esegue tutti gli scraper definiti in etfs
      const data = await Promise.all(
        Object.entries(etfs).map(async ([symbol, { fn, label }]) => {
          const result = await fn();
          return { symbol, label, ...result };
        })
      );
      values = { source: "etf", data };
    } catch (err) {
      console.error("Errore scraper:", err);
      values = { source: "etf", data: [] };
    }
  } else {
    try {
      // legge il file previousClose.json
      const raw = fs.readFileSync("./data/previousClose.json", "utf8");
      const parsed = JSON.parse(raw);

      // Se è già un array lo uso direttamente, se è un oggetto lo trasformo
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
    // Ora locale in formato leggibile
    datetime: now.toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
    status,
    values
  });
});

export default router;
