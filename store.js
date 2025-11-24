const data = {};

export function savePrice(symbol, values) {
  const now = new Date().toISOString();

  // Se esiste già un valore precedente, calcolo la variazione
  const prev = data[symbol]?.mid ? parseFloat(data[symbol].mid.replace(",", ".")) : null;
  const current = parseFloat(values.mid.replace(",", "."));

  let change = "";
  if (prev !== null && !isNaN(current)) {
    const diff = current - prev;
    const perc = (diff / prev) * 100;
    change = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  data[symbol] = {
    ...values,
    change: change || values.change, // se già fornito, lo mantengo
    updatedAt: now
  };
}

export function getPrice(symbol) {
  return data[symbol] || null;
}

export function getAllPrices() {
  return data;
}
