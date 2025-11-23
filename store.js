const memory = new Map();

export function getAllQuotes() {
  const out = {};
  for (const [symbol, data] of memory.entries()) out[symbol] = data;
  return out;
}

export function getQuote(symbol) {
  return memory.get(symbol) || null;
}

export function setQuote(symbol, currentData) {
  const existing = memory.get(symbol);
  if (existing?.current) {
    memory.set(symbol, { previous: existing.current, current: currentData });
  } else {
    memory.set(symbol, { previous: null, current: currentData });
  }
}
