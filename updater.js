import getVUAA from "./vuaa.js";
import getVNGA80 from "./vnga80.js";
import getGOLD from "./gold.js";
import { savePrice } from "./store.js";

async function updateAll() {
  const vuaa = await getVUAA();
  savePrice("VUAA", vuaa);

  const vnga80 = await getVNGA80();
  savePrice("VNGA80", vnga80);

  const gold = await getGOLD();
  savePrice("GOLD", gold);

  console.log("✅ Aggiornamento completato");
}

// Aggiorna ogni minuto
setInterval(updateAll, 60 * 1000);

main();

