import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Ricostruisci __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// utils.js è in core/, quindi sali di una cartella e vai in data/
const CLOSE_FILE = path.join(__dirname, "../data/previousClose.json");

export function safeParse(value) {
  if (!value) return null;
  return parseFloat(String(value).replace(",", "."));
}

export async function fetchWithRetry(url, selector, retries = 5, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const mid = $(selector).text().trim();
    if (mid) {
      return { $, mid };
    }
    await new Promise(r => setTimeout(r, delay));
  }
  return { $, mid: null };
}

// Ora legge solo "value" (formato uniforme)
function getPreviousClose(symbol) {
  if (!fs.existsSync(CLOSE_FILE)) {
    console.info("INFO File previousClose.json non trovato:", CLOSE_FILE);
    return null;
  }
  try {
    const closes = JSON.parse(fs.readFileSync(CLOSE_FILE));
    const raw = closes[symbol]?.value ?? null;
    if (raw === null) {
      console.info(`INFO Nessun valore salvato per ${symbol}`);
      return null;
    }
    return safeParse(raw);
  } catch (e) {
    console.error("ERROR Errore lettura JSON:", e.message);
    return null;
  }
}

function saveClose(symbol, mid) {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 23 && mid) {
    const closes = fs.existsSync(CLOSE_FILE)
      ? JSON.parse(fs.readFileSync(CLOSE_FILE))
      : {};
    closes[symbol] = {
      value: safeParse(mid),
      date: now.toISOString().split("T")[0]
    };
    fs.writeFileSync(CLOSE_FILE, JSON.stringify(closes, null, 2));
    console.log(`SAVED previousClose per ${symbol}: ${mid}`);
  }
}

export async function createScraper(symbol, url, itemId) {
  const { $, mid } = await fetchWithRetry(
    url,
    `span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="mid"]`
  );

  const bid = $(`span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="bid"]`).text().trim();
  const ask = $(`span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="ask"]`).text().trim();
  const change = $(`span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="change"]`).text().trim();

  const prevClose = getPreviousClose(symbol);
  let dailyChange = "";

  if (prevClose !== null && mid) {
    const current = safeParse(mid);
    if (current !== null) {
      const diff = current - prevClose;
      const perc = (diff / prevClose) * 100;
      dailyChange = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
    }
  } else {
    console.info(`INFO Nessun dailyChange disponibile per ${symbol} (manca valore precedente)`);
  }

  if (mid) saveClose(symbol, mid);

  return {
    source: "LS-TC",
    symbol,
    price: safeParse(mid),
    bid: safeParse(bid),
    ask: safeParse(ask),
    change,
    dailyChange,
    currency: "EUR",
    status: mid ? "open" : "unavailable"
  };
}
