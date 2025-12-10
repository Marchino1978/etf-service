// routes/savePreviousClose.js
import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const router = express.Router();

// Ricostruisci __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoint sorgente: i prezzi correnti
const url = "http://localhost:3000/api/etf";
// Percorso del file previousClose.json
const filePath = path.join(__dirname, "../data/previousClose.json");

router.get("/save-previous-close", async (req, res) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    const snapshot = [];
    const today = new Date().toISOString().split("T")[0];

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
    console.log("✅ previousClose.json aggiornato:", filePath);

    res.json({ status: "ok", updated: snapshot.length });
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;