// scripts/savePreviousClose.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = "http://localhost:3000/api/etf"; // endpoint locale
const dataDir = path.join(__dirname, "../data");
const filePath = path.join(dataDir, "previousClose.json");

const labels = {
  VUAA: "S&P 500",
  VNGA80: "LifeStrategy 80",
  GOLD: "Physical Gold",
  SWDA: "Core MSCI World",
  VWCE: "FTSE All World",
  XEON: "XEON",
  XUSE: "MSCI World Ex-USA",
  EXUS: "MSCI World Ex-USA"
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

async function savePreviousClose() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log("Creata cartella data/:", dataDir);
    }

    const res = await axios.get(url);
    const data = res.data;

    const today = new Date().toISOString().split("T")[0];
    const snapshot = {};
    const rows = [];

    for (const key in data) {
      const price = data[key]?.price;
      const p = parseFloat(price);
      if (!isNaN(p)) {
        // Recupera il previousClose del giorno prima da Supabase
        let prevClose = null;
        if (supabase) {
          const { data: prevRow } = await supabase
            .from("previous_close")
            .select("close_value")
            .eq("symbol", key)
            .order("snapshot_date", { ascending: false })
            .limit(1);
          prevClose = prevRow?.[0]?.close_value ?? null;
        }

        snapshot[key] = {
          label: labels[key] || key,
          price: p,
          previousClose: prevClose, // NON uguale al prezzo corrente
          date: today
        };

        rows.push({
          symbol: key,
          lastPrice: p,           // snapshot del giorno chiuso
          previousClose: prevClose, // chiusura del giorno prima
          lastChange: prevClose
            ? (((p - prevClose) / prevClose) * 100).toFixed(2)
            : "N/A",
          snapshot_date: today
        });
      } else {
        console.warn(`Nessun valore valido per ${key}, salto`);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("previousClose.json aggiornato:", filePath);

    if (supabase && rows.length > 0) {
      const { error } = await supabase.from("etf_prices").insert(rows);
      if (error) throw error;
      console.log(`Inseriti ${rows.length} record su Supabase per data ${today}`);
    }
  } catch (err) {
    console.error("Errore nel salvataggio:", err?.message || err);
  }
}

savePreviousClose();
