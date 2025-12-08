// utils.js
import fetch from "node-fetch";
import * as cheerio from "cheerio";

// Funzione per convertire stringhe numeriche in float in modo sicuro
export function safeParse(value) {
  if (!value) return null;
  return parseFloat(value.replace(",", "."));
}

// Funzione helper con retry per scraping
export async function fetchWithRetry(url, selector, retries = 3, delay = 1000) {
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
