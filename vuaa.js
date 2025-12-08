import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const CLOSE_FILE = path.join(process.cwd(), "previousClose.json");

function getPreviousClose(symbol) {
  if (!fs.existsSync(CLOSE_FILE)) return null;
  const closes = JSON.parse(fs.readFileSync(CLOSE_FILE));
  return closes[symbol]?.value || null;
}

function saveClose(symbol, mid) {
  const now = new Date();
  const hour = now.getHours();

  // Broker chiude alle 23:00 → salvo ultimo prezzo come chiusura
  if (hour >= 23) {
    const closes = fs.existsSync(CLOSE_FILE)
      ? JSON.parse(fs.readFileSync(CLOSE_FILE))
      : {};
    closes[symbol] = {
      value: parseFloat(mid.replace(",", ".")),
      date: now.toISOString().split("T")[0]
    };
    fs.writeFileSync(CLOSE_FILE, JSON.stringify(closes, null, 2));
  }
}

// 🔴 AGGIUNTO: funzione helper con retry
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const mid = $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="mid"]').text().trim();
    if (mid) {
      return { $, mid };
    }
    await new Promise(r => setTimeout(r, delay)); // 🔴 AGGIUNTO: pausa tra i tentativi
  }
  return { $, mid: null };
}

export default async function getVUAA() {
  const url = "https://www.ls-tc.de/de/etf/1045562";

  // 🔴 MODIFICATO: uso fetchWithRetry invece di fetch diretto
  const { $, mid } = await fetchWithRetry(url);

  const bid = $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="bid"]').text().trim();
  const ask = $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="ask"]').text().trim();
  const change = $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="change"]').text().trim();

  const prevClose = getPreviousClose("VUAA");
  let dailyChange = "";
  if (prevClose !== null && mid) {
    const current = parseFloat(mid.replace(",", "."));
    const diff = current - prevClose;
    const perc = (diff / prevClose) * 100;
    dailyChange = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  if (mid) saveClose("VUAA", mid);

  return {
    source: "LS-TC",              // 🔴 AGGIUNTO
    symbol: "VUAA",               // 🔴 AGGIUNTO
    price: mid ? parseFloat(mid.replace(",", ".")) : null, // 🔴 AGGIUNTO
    bid: bid ? parseFloat(bid.replace(",", ".")) : null,
    ask: ask ? parseFloat(ask.replace(",", ".")) : null,
    change,
    dailyChange,
    currency: "EUR",              // 🔴 AGGIUNTO
    status: mid ? "open" : "unavailable" // 🔴 AGGIUNTO
  };
}

// Se eseguito direttamente, stampa i dati
if (import.meta.url === `file://${process.argv[1]}`) {
  getVUAA().then(data => console.log("VUAA:", data));
}
