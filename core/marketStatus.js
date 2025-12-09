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

  // Fascia oraria
  const openTime = new Date(now);
  openTime.setHours(MARKET_OPEN.hour, MARKET_OPEN.minute, 0, 0);

  const closeTime = new Date(now);
  closeTime.setHours(MARKET_CLOSE.hour, MARKET_CLOSE.minute, 0, 0);

  return now >= openTime && now <= closeTime;
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
      values = { source: "previous-close", data: JSON.parse(raw) };
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
