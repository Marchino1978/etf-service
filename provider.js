1import fetch from 'node-fetch';

const API_KEY = process.env.FINNHUB_API_KEY;

export async function fetchQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub error ${res.status}`);
  const data = await res.json();
  return {
    price: data.c,
    changePct: data.dp,
    currency: 'EUR',
    ts: new Date().toISOString()
  };
}
