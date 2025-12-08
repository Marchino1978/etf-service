// scripts/savePreviousClose.js
import fs from "fs";
import path from "path";
import axios from "axios";

const url = "http://localhost:3000/api/etf"; // endpoint locale
// Salva sempre nella cartella data/ del progetto
const filePath = path.join(process.cwd(), "data", "previousClose.json");

async function savePreviousClose() {
  try {
    const res = await axios.get(url);
    const data = res.data;

    const snapshot = {};
    const today = new Date().toISOString().split("T")[0];

    for (const key in data) {
      snapshot[key] = {
        value: parseFloat(String(data[key].mid).replace(",", ".")),
        date: today
      };
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato manualmente in:", filePath);
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err.message);
  }
}

savePreviousClose();
