// scripts/savePreviousClose.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { exec } from "child_process";

// Ricostruisci __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = "http://localhost:3000/api/etf"; // endpoint locale
// Percorso cartella e file
const dataDir = path.join(__dirname, "../data");
const filePath = path.join(dataDir, "previousClose.json");

// Mappa etichette locale (fallback = simbolo)
const labels = {
  VUAA: "S&P 500",
  VNGA80: "LifeStrategy 80",
  GOLD: "Physical Gold",
  SWDA: "Core MSCI World",
  VWCE: "VWCE",
  XEON: "XEON",
  XUSE: "XUSE",
  EXUS: "EXUS"
};

async function savePreviousClose() {
  try {
    // Assicura che la cartella data/ esista
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log("📁 Creata cartella data/:", dataDir);
    }

    const res = await axios.get(url);
    const data = res.data;

    const today = new Date().toISOString().split("T")[0];
    const snapshot = {};

    // Trasforma i dati in mappa per simbolo
    for (const key in data) {
      const price = data[key]?.price;
      const p = parseFloat(price);
      if (!isNaN(p)) {
        snapshot[key] = {
          label: labels[key] || key,
          price: p,
          previousClose: p,
          date: today
        };
      } else {
        console.warn(`⚠️ Nessun valore valido per ${key}, salto`);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato in formato mappa:", filePath);

    // Se ti serve il push automatico (mantengo la tua logica attuale)
    exec(`
      cd ${path.join(__dirname, "..")} &&
      git config user.name "Marchino1978" &&
      git config user.email "marco.brambill@gmail.com" &&
      git add -A &&
      git commit --allow-empty -m "Update previousClose.json [ci skip]" &&
      git pull origin main --rebase &&
      git push
    `, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Errore push su Git:", error.message);
        console.error(stderr);
      } else {
        console.log("✅ Push eseguito (anche se nessuna modifica)");
        console.log(stdout);
      }
    });

  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err);
  }
}

savePreviousClose();
