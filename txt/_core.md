# core//index.js
----------------------------------------
~~~
// scrapers/index.js
import getVUAA from "../scrapers/vuaa.js";
import getVNGA80 from "../scrapers/vnga80.js";
import getGOLD from "../scrapers/gold.js";
import getXEON from "../scrapers/xeon.js";
import getVWCE from "../scrapers/vwce.js";
// import getISAC from "../scrapers/isac.js";
// import getX13E from "../scrapers/x13e.js";
// import getIUSQ from "../scrapers/iusq.js";
import getSWDA from "../scrapers/swda.js";
import getXUSE from "../scrapers/xuse.js";
import getEXUS from "../scrapers/exus.js";

// Mappa ETF centralizzata: simbolo → { funzione scraper, label }
export const etfs = {
  VUAA:   { fn: getVUAA,   label: "S&P 500",           ISIN: "IE00BFMXXD54" },
  VNGA80: { fn: getVNGA80, label: "LifeStrategy 80",   ISIN: "IE00BMVB5R75" },
  GOLD:   { fn: getGOLD,   label: "Physical Gold",     ISIN: "FR0013416716" },
  XEON:   { fn: getXEON,   label: "XEON",              ISIN: "LU0290358497" },
  VWCE:   { fn: getVWCE,   label: "FTSE All World",    ISIN: "IE00BK5BQT80" },
  // ISAC:   { fn: getISAC,   label: "MSCI All World",    ISIN: "IE00B6R52259" },
  // X13E:   { fn: getX13E,   label: "EUR Gov Bond",      ISIN: "LU0290356871" },
  // IUSQ:   { fn: getIUSQ,   label: "MSCI All World",    ISIN: "IE00B6R52259" },
  SWDA:   { fn: getSWDA,   label: "Core MSCI World",   ISIN: "IE00B4L5Y983" },
  XUSE:   { fn: getXUSE,   label: "MSCI World Ex-USA", ISIN: "IE000R4ZNTN3" },
  EXUS:   { fn: getEXUS,   label: "MSCI World Ex-USA", ISIN: "IE0006WW1TQ4" }
};~~~


# core//logger.js
----------------------------------------
~~~
// core/logger.js
export function logInfo(msg) {
  console.log(`INFO ${msg}`);
}
export function logSuccess(msg) {
  console.log(`SUCCESS ${msg}`);
}
export function logWarn(msg) {
  console.warn(`WARN ${msg}`);
}
export function logError(msg) {
  console.error(`ERROR ${msg}`);
}
~~~


# core//marketStatus.js
----------------------------------------
~~~
// api/market-status.js
import supabase from "../lib/supabase.js";

export default async function handler(req, res) {
  try {
    // Recupera stato mercato da Supabase
    const { data: statusRow } = await supabase
      .from("market_status")
      .select("*")
      .order("datetime", { ascending: false })
      .limit(1);

    const marketOpen = statusRow?.open ?? false;
    const marketStatus = statusRow?.status ?? "CHIUSO";

    // Recupera dati ETF
    const { data: etfRows } = await supabase
      .from("etf_prices")
      .select("*")
      .order("date", { ascending: false });

    // Mappa per simbolo → ultima entry
    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    // Costruisci output
    const output = Object.values(latestBySymbol).map((etf) => {
      let price, previousClose, dailyChange;

      if (marketOpen) {
        price = etf.price;
        previousClose = etf.previousClose; // salvato dal cron il giorno prima
        dailyChange = previousClose
          ? (((price - previousClose) / previousClose) * 100).toFixed(2)
          : "N/A";
      } else {
        price = etf.lastPrice; // ultimo prezzo salvato
        previousClose = etf.previousClose; // quello del giorno prima
        dailyChange = etf.lastChange; // ultima variazione salvata
      }

      return {
        symbol: etf.symbol,
        label: etf.label,
        price,
        previousClose,
        dailyChange,
      };
    });

    res.status(200).json({
      datetime: statusRow?.datetime,
      status: marketStatus,
      open: marketOpen,
      values: {
        source: marketOpen ? "live" : "previous-close",
        data: output,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
~~~


# core//server.js
----------------------------------------
~~~
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
    console.error("ERROR lettura previousClose:", err.message);
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
    console.error("ERROR /api/etf:", error.message);
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
    console.error("ERROR /api/etf/:symbol:", error.message);
    res.status(500).json({ error: "Errore nel recupero ETF" });
  }
});

// Calcolo dailyChange: variazione rispetto all'ultimo record precedente disponibile
async function addDailyChange(symbol, price) {
  try {
    if (supabase) {
      const currentDate = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("previous_close")
        .select("close_value, snapshot_date")
        .eq("symbol", symbol)
        .lt("snapshot_date", currentDate)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;

      const prev = data?.[0]?.close_value ?? null;
      const current = parseFloat(price?.price ?? "NaN");

      const dailyChange = calcDailyChange(current, prev);

      return {
        ...price,
        dailyChange,
        previousClose: prev,
        previousDate: data?.[0]?.snapshot_date ?? null,
        ISIN: etfs[symbol]?.ISIN || "-",
        url: etfs[symbol]?.url || null
      };
    }
  } catch (err) {
    console.error("ERROR calcolo dailyChange:", err.message);
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
  console.log(`Server avviato su http://localhost:${PORT}`);
});
~~~


# core//store.js
----------------------------------------
~~~
// core/store.js
import { safeParse } from "./utils.js";
import supabase from "./supabaseClient.js";

const data = {};

// Salvataggio prezzo corrente + calcolo variazioni
export async function savePrice(symbol, values) {
  const now = new Date().toISOString();

  // CHANGE: variazione rispetto al valore precedente in memoria
  const prevMid = data[symbol]?.mid ? safeParse(data[symbol].mid) : null;
  const currentMid = safeParse(values.mid);
  let change = "0.0000 (0.00%)";
  if (!isNaN(currentMid) && prevMid !== null) {
    const diff = currentMid - prevMid;
    const perc = (diff / prevMid) * 100;
    change = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  // PreviousClose: recupero da Supabase
  let prevClose = null;
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from("previous_close")
        .select("close_value, snapshot_date")
        .eq("symbol", symbol)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;
      prevClose = rows?.[0]?.close_value ?? null;
    } catch (err) {
      console.error(`HO SCRITTO un errore nella lettura Supabase per ${symbol}: ${err.message}`);
    }
  }

  // 🔎 Blindatura: dailyChange sempre stringa
  let dailyChange = "N/A";
  if (typeof values.dailyChange === "number") {
    dailyChange = values.dailyChange.toFixed(2);
  } else if (typeof values.dailyChange === "string") {
    dailyChange = values.dailyChange;
  } else if (typeof values.dailyChange === "object") {
    // se arriva un oggetto vuoto {}, lo forzo a "N/A"
    dailyChange = "N/A";
  }

  // Salvataggio in memoria
  data[symbol] = {
    ...values,
    label: values.label || symbol,
    change,
    dailyChange,
    previousClose: prevClose,
    updatedAt: now
  };
}

export function getPrice(symbol) {
  return data[symbol] || null;
}

export function getAllPrices() {
  return data;
}
~~~


# core//supabaseClient.js
----------------------------------------
~~~
// core/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Carica variabili d'ambiente dalla root del progetto
dotenv.config({ path: "./.env" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.info("Supabase inizializzato");
} else {
  console.warn("Supabase non configurato: controlla il file .env");
}

export default supabase;
~~~


# core//updater.js
----------------------------------------
~~~
// core/updater.js
import { etfs } from "../core/index.js";   // mappa ETF centralizzata
import { savePrice } from "../core/store.js";
import supabase from "./supabaseClient.js";
import { logInfo, logSuccess, logWarn, logError } from "./logger.js";

async function upsertSnapshot(symbol, price, label) {
  if (!supabase || typeof price !== "number") return { status: "no-supabase" };

  const today = new Date().toISOString().split("T")[0];

  const payload = { symbol, close_value: price, snapshot_date: today, label };

  const { error } = await supabase
    .from("previous_close")
    .upsert(payload, { onConflict: ["symbol", "snapshot_date"] });

  if (error) {
    logError(`Errore upsert Supabase per ${symbol}: ${error.message}`);
    return { status: "supabase-error" };
  }
  logSuccess(`Snapshot salvato per ${symbol} (${today})`);

  let prevValue = null;
  let dailyChange = null;

  try {
    const { data: prevRows, error: prevError } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .lt("snapshot_date", today)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (prevError) logError(`Errore fetch previous per ${symbol}: ${prevError.message}`);

    if (prevRows && prevRows.length > 0) {
      prevValue = prevRows[0].close_value;
      if (prevValue !== 0) {
        dailyChange = ((price - prevValue) / prevValue) * 100;
        logSuccess(`DailyChange per ${symbol}: ${dailyChange.toFixed(2)} %`);
      } else {
        logWarn(`DailyChange non calcolabile per ${symbol}: previousClose = 0`);
      }
    } else {
      logInfo(`Nessun record precedente per ${symbol} (primo inserimento)`);
    }
  } catch (err) {
    logError(`Errore calcolo dailyChange per ${symbol}: ${err.message}`);
  }

  return { status: "ok", previousClose: prevValue, dailyChange };
}

async function updateAll() {
  logInfo("Avvio aggiornamento ETF...");
  const results = [];

  for (const [symbol, { fn, label }] of Object.entries(etfs)) {
    try {
      const data = await fn();
      const r = await upsertSnapshot(symbol, data?.price, label);

      // 🔎 Forza dailyChange a stringa
      let dcString = "N/A";
      if (typeof r.dailyChange === "number") {
        dcString = r.dailyChange.toFixed(2);
      } else if (typeof r.dailyChange === "string") {
        dcString = r.dailyChange;
      }

      await savePrice(symbol, { 
        ...data, 
        label, 
        previousClose: r.previousClose ?? null,
        dailyChange: dcString
      });

      results.push({ symbol, status: r.status });
    } catch (err) {
      if (err?.response?.status === 429) {
        logWarn(`${symbol}: rate limit (429), mantengo dati esistenti`);
        results.push({ symbol, status: "rate-limited" });
      } else {
        logError(`${symbol}: errore durante scraping → ${err.message}`);
        results.push({ symbol, status: "error" });
      }
    }
  }

  if (process.env.NODE_ENV !== "test") {
    logInfo(`Risultato aggiornamento: ${JSON.stringify(results)}`);
  }
}

(async () => {
  logInfo("Inizializzazione updater: verranno generati/aggiornati i dati ETF");
  await updateAll();
})();

export default updateAll;
~~~


# core//utilsDailyChange.js
----------------------------------------
~~~
// core/utilsDailyChange.js
import supabase from "./supabaseClient.js";

export async function calcDailyChange(symbol, currentPrice) {
  if (!supabase || typeof currentPrice !== "number") return "N/A";

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .lt("snapshot_date", today)
      .not("close_value", "is", null)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return "N/A";

    const prevClose = Number(data[0].close_value);
    if (isNaN(prevClose)) return "N/A";

    const variation = ((currentPrice - prevClose) / prevClose) * 100;

    // 🔎 Correzione: niente spazio + niente doppio simbolo
    return variation.toFixed(2); // solo numero
    // oppure: return `${variation.toFixed(2)}%`;
  } catch (err) {
    console.error(`Errore calcolo dailyChange per ${symbol}: ${err.message}`);
    return "N/A";
  }
}
~~~


# core//utils.js
----------------------------------------
~~~
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
~~~


