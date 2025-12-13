// scripts/savePreviousClose.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js"; // NEW

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

// Supabase (valori da Environment in Render)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

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
    const rows = []; // NEW: per inserimenti su Supabase

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

        // NEW: prepara riga per Supabase
        rows.push({
          symbol: key,
          close_value: p,
          snapshot_date: today
        });
      } else {
        console.warn(`⚠️ Nessun valore valido per ${key}, salto`);
      }
    }

    // Scrivi file locale (come prima)
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato in formato mappa:", filePath);

    // NEW: inserisci su Supabase se configurato
    if (!supabase) {
      console.warn("⚠️ Supabase non configurato (mancano SUPABASE_URL/ANON_KEY), salto inserimento");
    } else if (rows.length > 0) {
      const { error } = await supabase.from("previous_close").insert(rows);
      if (error) throw error;
      console.log(`✅ Inseriti ${rows.length} record su Supabase per data ${today}`);
    } else {
      console.warn("⚠️ Nessuna riga valida da inserire su Supabase");
    }
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err?.message || err);
  }
}

savePreviousClose();
