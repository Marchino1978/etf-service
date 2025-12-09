// scripts/savePreviousClose.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

// Ricostruisci __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = "http://localhost:3000/api/etf"; // endpoint locale
// Salva sempre nella cartella data/ del progetto
const filePath = path.join(__dirname, "../data/previousClose.json");

async function savePreviousClose() {
  try {
    const res = await axios.get(url);
    const data = res.data;

    const snapshot = [];
    const today = new Date().toISOString().split("T")[0];

    // Trasforma i dati in array di oggetti
    for (const key in data) {
      const price = data[key]?.price;
      if (price && !isNaN(parseFloat(price))) {
        snapshot.push({
          symbol: key,
          value: parseFloat(price),
          date: today
        });
      } else {
        console.warn(`⚠️ Nessun valore valido per ${key}, salto`);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato in formato array:", filePath);
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err);
  }
}

savePreviousClose();
