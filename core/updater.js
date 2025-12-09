import * as scrapers from "../core/index.js";   // index.js dentro core/
import { savePrice } from "../core/store.js";

// Configurazione ETF: simbolo → { funzione scraper, label }
const ETF_CONFIG = {
  VUAA:   { fn: scrapers.getVUAA,   label: "S&P 500" },
  VNGA80: { fn: scrapers.getVNGA80, label: "LifeStrategy 80" },
  GOLD:   { fn: scrapers.getGOLD,   label: "Physical Gold" },
  XEON:   { fn: scrapers.getXEON,   label: "XEON" },
//  ISAC:   { fn: scrapers.getISAC,   label: "MSCI All World" },
//  X13E:   { fn: scrapers.getX13E,   label: "EUR Gov Bond" },
  VWCE:   { fn: scrapers.getVWCE,   label: "FTSE All World" },
  IUSQ:   { fn: scrapers.getIUSQ,   label: "MSCI All World" }
};

async function updateAll() {
  console.log("🔄 Avvio aggiornamento ETF...");
  const results = [];

  for (const [symbol, { fn, label }] of Object.entries(ETF_CONFIG)) {
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

  // 📊 Log riepilogo solo se non siamo in modalità test
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
