// routes/savePreviousClose.js
import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { createClient } from "@supabase/supabase-js"; // NEW

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mappa etichette locale (puoi ampliarla; fallback = simbolo)
const labels = {
  VUAA: "S&P 500",
  VNGA80: "LifeStrategy 80",
  GOLD: "Physical Gold",
  SWDA: "Core MSCI World"
};

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const url = `${baseUrl}/api/etf`;
const filePath = path.join(__dirname, "../data/previousClose.json");

// Supabase client (valori da Environment)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

router.get("/save-previous-close", async (req, res) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    const today = new Date().toISOString().split("T")[0];
    const snapshot = {};
    const rows = []; // NEW: per Supabase

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
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato:", filePath);

    // NEW: inserisci su Supabase
    if (!supabase) {
      console.warn("⚠️ Supabase non configurato (mancano SUPABASE_URL/ANON_KEY), salto inserimento");
    } else if (rows.length > 0) {
      const { error } = await supabase.from("previous_close").insert(rows);
      if (error) {
        console.error("❌ Errore inserimento Supabase:", error.message);
      } else {
        console.log(`✅ Inseriti ${rows.length} record su Supabase per data ${today}`);
      }
    }

    // Operazioni Git opzionali: commenta se non ti servono in locale
    exec(
      `
      cd ${path.join(__dirname, "..")} &&
      git add -A &&
      (git diff --cached --quiet || git commit -m "Update previousClose.json [ci skip]") &&
      git pull origin main --rebase &&
      git push
    `,
      (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Errore push su Git:", error.message);
          console.error(stderr);
        } else {
          console.log("✅ Push eseguito");
          console.log(stdout);
        }
      }
    );

    res.json({ status: "ok", updated: Object.keys(snapshot).length, date: today });
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
