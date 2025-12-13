// routes/savePreviousClose.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAllPrices } from "../core/store.js";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const prevPath = path.join(__dirname, "../data/previousClose.json");

// Supabase client (valori da Environment)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Endpoint per salvare i valori di chiusura
router.get("/save-previous-close", async (req, res) => {
  try {
    const allPrices = getAllPrices();
    const snapshotDate = new Date().toISOString().split("T")[0];

    // Prepara i dati per Supabase
    const rows = Object.entries(allPrices).map(([symbol, item]) => ({
      symbol,
      close_value: item.price,
      snapshot_date: snapshotDate,
    }));

    // Scrivi anche su file locale (cache per ESP32)
    fs.writeFileSync(prevPath, JSON.stringify(allPrices, null, 2));

    // Inserisci/aggiorna su Supabase
    if (supabase) {
      const { error } = await supabase
        .from("previous_close")
        .upsert(rows, { onConflict: ["symbol", "snapshot_date"] });

      if (error) {
        console.error("Errore Supabase upsert:", error.message);
        return res.status(500).json({ error: "Errore Supabase" });
      }
    }

    res.json({
      status: "ok",
      updated: rows.length,
      date: snapshotDate,
    });
  } catch (err) {
    console.error("Errore save-previous-close:", err.message);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
