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
      value: safeParse(mid),
      date: now.toISOString().split("T")[0]
    };
    fs.writeFileSync(CLOSE_FILE, JSON.stringify(closes, null, 2));
  }
}

export default async function getVNGA80() {
  const url = "https://www.ls-tc.de/en/etf/1376226";

  // uso fetchWithRetry importato
  const { $, mid } = await fetchWithRetry(
    url,
    'span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="mid"]'
  );

  const bid = $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="bid"]').text().trim();
  const ask = $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="ask"]').text().trim();
  const change = $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="change"]').text().trim();

  const prevClose = getPreviousClose("VNGA80");
  let dailyChange = "";
  if (prevClose !== null && mid) {
    const current = safeParse(mid);
    const diff = current - prevClose;
    const perc = (diff / prevClose) * 100;
    dailyChange = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  if (mid) saveClose("VNGA80", mid);

  return {
    source: "LS-TC",
    symbol: "VNGA80",
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
  getVNGA80().then(data => console.log("VNGA80:", data));
}
