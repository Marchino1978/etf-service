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
    savePrice("VUAA", vuaa);

    const vnga80 = await getVNGA80();
    savePrice("VNGA80", vnga80);

    const gold = await getGOLD();
    savePrice("GOLD", gold);

    const xeon = await getXEON();
    savePrice("XEON", xeon);

    const isac = await getISAC();
    savePrice("ISAC", isac);

    const x13e = await getX13E();
    savePrice("X13E", x13e);

    console.log("✅ Aggiornamento completato");
  } catch (err) {
    // ✅ Gestione specifica errore 429
    if (err.response && err.response.status === 429) {
      console.warn("⚠️ Rate limit raggiunto (429), bypass: mantengo i dati esistenti nello store");
      // Non aggiorno nulla, ma non blocco il servizio
    } else {
      console.error("❌ Errore durante l'aggiornamento:", err.message);
    }
  }
}

// 👉 Popola subito lo store all’avvio
updateAll();

// 👉 Aggiorna ogni 15 minuti (non più ogni minuto)
setInterval(updateAll, 15 * 60 * 1000); // <-- intervallo aumentato
