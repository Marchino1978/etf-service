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
  const minute = now.getMinutes();

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

export default async function getX13E() {
  const url = "https://www.ls-tc.de/de/etf/46985";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const mid = $('span[source="lightstreamer"][table="quotes"][item="46985@1"][field="mid"]').text().trim();
  const bid = $('span[source="lightstreamer"][table="quotes"][item="46985@1"][field="bid"]').text().trim();
  const ask = $('span[source="lightstreamer"][table="quotes"][item="46985@1"][field="ask"]').text().trim();
  const change = $('span[source="lightstreamer"][table="quotes"][item="46985@1"][field="change"]').text().trim();

  // Calcolo dailyChange rispetto alla chiusura salvata
  const prevClose = getPreviousClose("X13E");
  let dailyChange = "";
  if (prevClose !== null) {
    const current = parseFloat(mid.replace(",", "."));
    const diff = current - prevClose;
    const perc = (diff / prevClose) * 100;
    dailyChange = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  // Salvo chiusura se siamo a fine giornata
  saveClose("X13E", mid);

  return {
    mid,
    bid,
    ask,
    change,       // variazione intraday
    dailyChange   // variazione rispetto alla chiusura di ieri
  };
}

// Se eseguito direttamente, stampa i dati
if (import.meta.url === `file://${process.argv[1]}`) {
  getX13E().then(data => console.log("X13E:", data));
}
