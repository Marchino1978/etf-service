// savePreviousClose.js
import fs from "fs";
import path from "path";
import axios from "axios";

const url = "http://localhost:3000/api/etf"; // endpoint locale
const filePath = path.join(process.cwd(), "previousClose.json");

async function savePreviousClose() {
  try {
    const res = await axios.get(url);
    const data = res.data;

    const snapshot = {};
    for (const key in data) {
      snapshot[key] = {
        previousClose: data[key].mid
      };
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato manualmente");
  } catch (err) {
    console.error("Errore nel salvataggio:", err.message);
  }
}

savePreviousClose();
