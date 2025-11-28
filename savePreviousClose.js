// savePreviousClose.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const url = "https://etf-service.onrender.com/api/etf"; // endpoint API
const filePath = path.join(__dirname, "previousClose.json");

async function savePreviousClose() {
  try {
    const res = await axios.get(url);
    const data = res.data;

    // Salva i valori attuali come "previousClose"
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
