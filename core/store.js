import { safeParse } from "./utils.js";
import { createClient } from "@supabase/supabase-js";

// Supabase client (valori da Environment)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const data = {};

// --- Salvataggio prezzo corrente + calcolo variazioni ---
export async function savePrice(symbol, values) {
  const now = new Date().toISOString();

  // CHANGE: variazione rispetto al valore precedente in memoria
  const prev = data[symbol]?.mid ? safeParse(data[symbol].mid) : null;
  const current = safeParse(values.mid);

  let change = "";
  if (!isNaN(current)) {
    if (prev !== null) {
      const diff = current - prev;
      const perc = (diff / prev) * 100;
      change = `${diff.toFixed(4)} (${perc.toFixed(2)}%)`;
    } else {
      change = "0.0000 (0.00%)";
    }
  }

  // DAILYCHANGE: variazione rispetto alla chiusura salvata su Supabase
  let dailyChange = "";
  let prevClose = null;
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from("previous_close")
        .select("close_value")
        .eq("symbol", symbol)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (error) throw error;
      prevClose = rows?.[0]?.close_value ?? null;

      if (prevClose !== null && !isNaN(prevClose) && !isNaN(current)) {
        const diff = ((current - prevClose) / prevClose) * 100;
        dailyChange = diff.toFixed(2) + " %"; // spazio + %
      }
    } catch (err) {
      console.error(`❌ Errore lettura Supabase per ${symbol}:`, err.message);
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
