// core/updater.js
import { etfs } from "../core/index.js";   // mappa ETF centralizzata
import { savePrice } from "../core/store.js";
import { createClient } from "@supabase/supabase-js";

// Supabase client (valori da Environment)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

async function updateAll() {
  console.log("🔄 Avvio aggiornamento ETF...");
  const results = [];

  for (const [symbol, { fn, label }] of Object.entries(etfs)) {
    try {
      const data = await fn();

      // Salva nello store locale (per uso runtime)
      savePrice(symbol, { ...data, label });

      // Salva anche su Supabase come snapshot di chiusura
      if (supabase && data?.price) {
        const { error } = await supabase
          .from("previous_close")
          .insert({
            symbol,
            close_value: data.price,
            snapshot_date: new Date().toISOString(),
            label
          });

        if (error) {
          console.error(`❌ Errore inserimento Supabase per ${symbol}:`, error.message);
          results.push({ symbol, status: "supabase-error" });
        } else {
          results.push({ symbol, status: "ok" });
        }
      } else {
        results.push({ symbol, status: "no-supabase" });
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.warn(`⚠️ ${symbol}: rate limit (429), mantengo dati esistenti`);
        results.push({ symbol, status: "rate-limited" });
      } else {
        console.error(`❌ ${symbol}: errore durante scraping → ${err.message}`);
        results.push({ symbol, status: "error" });
      }
    }
  }

  if (process.env.NODE_ENV !== "test") {
    console.log("📊 Risultato aggiornamento:", results);
  }
}

// 👉 Popola subito lo store all’avvio
(async () => {
  console.info("ℹ️ Inizializzazione updater: verranno generati/aggiornati i dati ETF");
  await updateAll();
})();

// 👉 Aggiorna ogni 15 minuti
setInterval(updateAll, 15 * 60 * 1000);

export default updateAll;