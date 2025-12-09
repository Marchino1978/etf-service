// core/updater.js
import { etfs } from "../core/index.js";   // importa la mappa ETF centralizzata
import { savePrice } from "../core/store.js";

async function updateAll() {
  console.log("🔄 Avvio aggiornamento ETF...");
  const results = [];

  for (const [symbol, { fn, label }] of Object.entries(etfs)) {
    try {
      const data = await fn();
      savePrice(symbol, { ...data, label });
      results.push({ symbol, status: "ok" });
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
