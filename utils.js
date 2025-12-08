import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const CLOSE_FILE = path.join(process.cwd(), "previousClose.json");

export function safeParse(value) {
  if (!value) return null;
  return parseFloat(value.replace(",", "."));
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
