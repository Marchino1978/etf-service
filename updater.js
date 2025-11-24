import getVUAA from "./vuaa.js";
import getVNGA80 from "./vnga80.js";
import getGOLD from "./gold.js";
import { savePrice } from "./store.js";

async function updateAll() {
  savePrice("VUAA", await getVUAA());
  savePrice("VNGA80", await getVNGA80());
  savePrice("GOLD", await getGOLD());
  console.log("✅ Aggiornamento completato");
}

// Aggiorna subito e poi ogni minuto
updateAll();
setInterval(updateAll, 60 * 1000);
