// routes/savePreviousClose.js
import express from "express";
import supabase from "../core/supabaseClient.js";
import { logSuccess, logError } from "../core/logger.js";

const router = express.Router();

router.post("/save-previous-close", async (req, res) => {
  const { symbol, close_value, label } = req.body;

  if (!supabase) {
    return res.status(500).json({ error: "Supabase non configurato" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("previous_close").insert({
      symbol,
      close_value,
      snapshot_date: today,
      label
    });

    if (error) throw error;

    logSuccess(`Salvato previousClose per ${symbol}: ${close_value}`);
    res.json({ status: "ok" });
  } catch (err) {
    logError(`Errore salvataggio previousClose: ${err.message}`);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
