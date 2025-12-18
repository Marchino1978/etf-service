// core/store.js
import { safeParse } from "./utils.js";
import supabase from "./supabaseClient.js";
import { calcDailyChange } from "./utilsDailyChange.js";

const data = {};

// Salvataggio prezzo corrente + calcolo variazioni
export async function savePrice(symbol, values) {
  const now = new Date().toISOString();

  // CHANGE: variazione rispetto al valore precedente in memoria
  const prevMid = data[symbol]?.mid ? safeParse(data[symbol].mid) : null;
  const currentMid = safeParse(values.mid);
  let change = "0.0000 (0.00%)";
  if (!isNaN(currentMid) && prevMid !== null) {
    const diff = currentMid - prevMid;
    const perc = (diff / prevMid) * 100;
    change = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
  }

  // DAILYCHANGE: variazione rispetto alla chiusura salvata su Supabase
  let prevClose = null;
  let dailyChange = "N/A";
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from("previous_close")
        .select("close_value, snapshot_date")
        .eq("symbol", symbol)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;
      prevClose = rows?.[0]?.close_value ?? null;

      // 🔎 Usa await per ottenere la stringa da calcDailyChange
      dailyChange = await calcDailyChange(symbol, values.price);
    } catch (err) {
      console.error(`ERROR lettura Supabase per ${symbol}: ${err.message}`);
    }
  }

  // Salvataggio in memoria
  data[symbol] = {
    ...values,
    label: values.label || symbol,
    change,
    dailyChange,
    previousClose: prevClose,
    updatedAt: now
  };
}

export function getPrice(symbol) {
  return data[symbol] || null;
}

export function getAllPrices() {
  return data;
}
