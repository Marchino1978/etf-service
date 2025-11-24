const data = {};

export function savePrice(symbol, values) {
  data[symbol] = values;
}

export function getPrice(symbol) {
  return data[symbol] || null;
}

