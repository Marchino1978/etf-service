// routes/savePreviousClose.js
import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const labels = {
  VUAA: "S&P 500",
  VNGA80: "LifeStrategy 80",
  GOLD: "Physical Gold",
  SWDA: "Core MSCI World",
  VWCE: "FTSE All World",
  XEON: "XEON",
  XUSE: "MSCI Worls Ex-USA",
  EXUS: "MSCI Worls Ex-USA"
};

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const url = `${baseUrl}/api/etf`;
const filePath = path.join(__dirname, "../data/previousClose.json");

// Supabase client
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
    const rows = [];

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

        rows.push({
          symbol: key,
          close_value: p,
          snapshot_date: today
        });
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato:", filePath);

    if (supabase && rows.length > 0) {
      const { error } = await supabase.from("previous_close").insert(rows);
      if (error) {
        console.error("❌ Errore inserimento Supabase:", error.message);
      } else {
        console.log(`✅ Inseriti ${rows.length} record su Supabase per data ${today}`);
      }
    }

    res.json({ status: "ok", updated: Object.keys(snapshot).length, date: today });
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
