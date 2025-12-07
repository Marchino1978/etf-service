import fs from "fs";

const data = {};
let previousClose = {};

// Carica i valori di chiusura dal file, se esiste
try {
  previousClose = JSON.parse(fs.readFileSync("./previousClose.json", "utf8"));
} catch (err) {
  console.log("⚠️ Nessun previousClose.json trovato, dailyChange rimarrà vuoto");
}

export function savePrice(symbol, values) {
  const now = new Date().toISOString();

  // --- Calcolo CHANGE (variazione rispetto al valore precedente in memoria) ---
  const prev = data[symbol]?.mid ? parseFloat(data[symbol].mid.replace(",", ".")) : null;
  const current = parseFloat(values.mid.replace(",", "."));

  let change = "";
  if (!isNaN(current)) {
    if (prev !== null) {
      const diff = current - prev;
      const perc = (diff / prev) * 100;
      change = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
    } else {
      // primo valore: inizializza a 0
      change = "0.0000 (0.00%)";
    }
  }

  // --- Calcolo DAILYCHANGE (variazione rispetto alla chiusura salvata) ---
  let dailyChange = "";
  if (previousClose[symbol]) {
    const prevClose = parseFloat(previousClose[symbol].previousClose.replace(",", "."));
    if (!isNaN(prevClose) && !isNaN(current)) {
      const diff = ((current - prevClose) / prevClose) * 100;
      dailyChange = diff.toFixed(2) + "%";
    }
  }

  // --- Salvataggio dati ---
  data[symbol] = {
    ...values,         // contiene mid, ecc.
    label: values.label || symbol, // <-- aggiunto supporto label
    change,
    dailyChange,
    updatedAt: now
  };
}

export function getPrice(symbol) {
  return data[symbol] || null;
}

export function getAllPrices() {
  return data;
}
