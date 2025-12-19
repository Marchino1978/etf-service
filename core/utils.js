// core/utils.js
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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

export async function createScraper(symbol, url, itemId) {
  const { $, mid } = await fetchWithRetry(
    url,
    `span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="mid"]`
  );

  const bid = $(`span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="bid"]`).text().trim();
  const ask = $(`span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="ask"]`).text().trim();
  const change = $(`span[source="lightstreamer"][table="quotes"][item="${itemId}@1"][field="change"]`).text().trim();

  return {
    source: "LS-TC",
    symbol,
    price: safeParse(mid),
    bid: safeParse(bid),
    ask: safeParse(ask),
    change,
    currency: "EUR",
    status: mid ? "open" : "unavailable"
  };
}
