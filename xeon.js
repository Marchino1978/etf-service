import fs from "fs";
import path from "path";
import { safeParse, fetchWithRetry } from "./utils.js"; // 🔴 IMPORT

const CLOSE_FILE = path.join(process.cwd(), "previousClose.json");

function getPreviousClose(symbol) {
  if (!fs.existsSync(CLOSE_FILE)) return null;
  const closes = JSON.parse(fs.readFileSync(CLOSE_FILE));
  return closes[symbol]?.value || null;
}

function saveClose(symbol, mid) {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 23 && mid) {
    const closes = fs.existsSync(CLOSE_FILE)
      ? JSON.parse(fs.readFileSync(CLOSE_FILE))
      : {};
    closes[symbol] = {
      value: safeParse(mid), // uso safeParse importato
      date: now.toISOString().split("T")[0]
    };
    fs.writeFileSync(CLOSE_FILE, JSON.stringify(closes, null, 2));
  }
}

export default async function getXEON() {
  const url = "https://www.ls-tc.de/de/etf/58124";

  // uso fetchWithRetry importato
  const { $, mid } = await fetchWithRetry(
    url,
    'span[source="lightstreamer"][table="quotes"][item="58124@1"][field="mid"]'
  );

  const bid = $('span[source="lightstreamer"][table="quotes"][item="58124@1"][field="bid"]').text().trim();
  const ask = $('span[source="lightstreamer"][table="quotes"][item="58124@1"][field="ask"]').text().trim();
  const change = $('span[source="lightstreamer"][table="quotes"][item="58124@1"][field="change"]').text().trim();

  const prevClose = getPreviousClose("XEON");
  let dailyChange = "";
  if (prevClose !== null && mid) {
    const current = safeParse(mid);
    const diff = current - prevClose;
    const perc = (diff / prevClose) * 100;
    dailyChange = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  if (mid) saveClose("XEON", mid);

  return {
    source: "LS-TC",
    symbol: "XEON",
    price: safeParse(mid),
    bid: safeParse(bid),
    ask: safeParse(ask),
    change,
    dailyChange,
    currency: "EUR",
    status: mid ? "open" : "unavailable"
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  getXEON().then(data => console.log("XEON:", data));
}
