// CORE/marketStatus.js
import express from "express";
import fs from "fs";
import * as scrapers from "../scrapers/index.js"; // importa TUTTI gli scraper
import Holidays from "date-holidays";

const router = express.Router();
const hd = new Holidays("IT");

// Orari di apertura/chiusura mercato
const MARKET_OPEN = { hour: 7, minute: 30 };
const MARKET_CLOSE = { hour: 23, minute: 0 };

function isMarketOpen(now) {
  if (hd.isHoliday(now)) return false;

  const day = now.getDay(); // 0=dom, 6=sab
  if (day === 0 || day === 6) return false;

  const openTime = new Date(now);
  openTime.setHours(MARKET_OPEN.hour, MARKET_OPEN.minute, 0, 0);

  const closeTime = new Date(now);
  closeTime.setHours(MARKET_CLOSE.hour, MARKET_CLOSE.minute, 0, 0);

  return now >= openTime && now <= closeTime;
}

router.get("/market-status", async (req, res) => {
  const now = new Date();
  const status = isMarketOpen(now) ? "APERTO" : "CHIUSO";

  let values;
  if (status === "APERTO") {
    // esegue tutti gli scraper esportati da index.js
    const data = await Promise.all(
      Object.values(scrapers).map(scraperFn => scraperFn())
    );
    values = { source: "etf", data };
  } else {
    // legge il file previousClose.json
    const raw = fs.readFileSync("./DATA/previousClose.json");
    values = { source: "previous-close", data: JSON.parse(raw) };
  }

  res.json({
    datetime: now.toISOString(),
    status,
    values
  });
});

export default router;
