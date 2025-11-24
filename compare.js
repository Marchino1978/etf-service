// compare.js
import fetch from "node-fetch";

const FINNHUB_KEY = "d4b7pvpr01qrv4at4cjgd4b7pvpr01qrv4at4ck0"; // <-- sostituisci con la tua chiave reale

// --- Finnhub ---
async function getQuoteFinnhub(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.c && data.c !== 0) {
      return {
        source: "Finnhub",
        symbol,
        price: data.c,
        open: data.o,
        high: data.h,
        low: data.l,
        prevClose: data.pc,
        time: new Date(data.t * 1000).toISOString(),
        currency: "USD", // Finnhub non sempre restituisce la valuta
        status: "open"
      };
    } else if (data && data.pc && data.pc !== 0) {
      return {
        source: "Finnhub",
        symbol,
        price: data.pc,
        open: data.o,
        high: data.h,
        low: data.l,
        prevClose: data.pc,
        time: new Date(data.t * 1000).toISOString(),
        currency: "USD",
        status: "closed"
      };
    }
    return null;
  } catch (err) {
    console.error(`Errore Finnhub per ${symbol}:`, err.message);
    return null;
  }
}

// --- Yahoo Finance ---
async function getQuoteYahoo(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.quoteResponse || !data.quoteResponse.result || data.quoteResponse.result.length === 0) {
      return null;
    }

    const q = data.quoteResponse.result[0];
    return {
      source: "Yahoo",
      symbol,
      price: q.regularMarketPrice,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      prevClose: q.regularMarketPreviousClose,
      time: new Date(q.regularMarketTime * 1000).toISOString(),
      currency: q.currency,
      status: q.marketState === "CLOSED" ? "closed" : "open"
    };
  } catch (err) {
    console.error(`Errore Yahoo per ${symbol}:`, err.message);
    return null;
  }
}

// --- Wrapper ---
async function getQuote(symbol) {
  const finnhubData = await getQuoteFinnhub(symbol);
  if (finnhubData) return finnhubData;

  const yahooData = await getQuoteYahoo(symbol);
  return yahooData || { symbol, price: null, status: "unknown", source: "none" };
}

// --- Main ---
async function main() {
  const symbols = ["VUAA.DE", "VUAA.MI", "VUAA.L"]; // ETF europei
  const results = [];

  for (const s of symbols) {
    const q = await getQuote(s);
    results.push(q);
  }

  console.log("📈 Risultati:");
  results.forEach(r => {
    console.log(
      `${r.symbol}: ${r.price ?? "N/D"} ${r.currency ?? ""} (status: ${r.status}, source: ${r.source}) [aggiornato: ${r.time ?? "-"}]`
    );
  });
}

main();
