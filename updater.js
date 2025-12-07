import getVUAA from "./vuaa.js";
import getVNGA80 from "./vnga80.js";
import getGOLD from "./gold.js";
import getXEON from "./xeon.js";
import getISAC from "./isac.js";
import getX13E from "./x13e.js";
import { savePrice } from "./store.js";

async function updateAll() {
  try {
    // Scraping dei singoli ETF
    const vuaa = await getVUAA();
    savePrice("VUAA", { ...vuaa, label: "S&P 500" });

    const vnga80 = await getVNGA80();
    savePrice("VNGA80", { ...vnga80, label: "LifeStrategy 80" });

    const gold = await getGOLD();
    savePrice("GOLD", { ...gold, label: "Physical Gold" });

    const xeon = await getXEON();
    savePrice("XEON", { ...xeon, label: "XEON" });

    const isac = await getISAC();
    savePrice("ISAC", { ...isac, label: "MSCI All World" });

    const x13e = await getX13E();
    savePrice("X13E", { ...x13e, label: "EUR Gov Bond" });

    console.log("✅ Aggiornamento completato");
  } catch (err) {
    // ✅ Gestione specifica errore 429
    if (err.response && err.response.status === 429) {
      console.warn("⚠️ Rate limit raggiunto (429), bypass: mantengo i dati esistenti nello store");
    } else {
      console.error("❌ Errore durante l'aggiornamento:", err.message);
    }
  }
}

// 👉 Popola subito lo store all’avvio
updateAll();

// 👉 Aggiorna ogni 15 minuti
setInterval(updateAll, 15 * 60 * 1000);
