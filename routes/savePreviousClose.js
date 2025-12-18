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
    // Recupera il previousClose del giorno precedente
    const today = new Date().toISOString().split("T")[0];
    let prevClose = null;

    const { data: prevRow, error: prevError } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .lt("snapshot_date", today)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (prevError) throw prevError;
    prevClose = prevRow?.[0]?.close_value ?? null;

    // Calcola variazione rispetto al giorno precedente
    const lastChange =
      prevClose && close_value
        ? (((close_value - prevClose) / prevClose) * 100).toFixed(2)
        : "N/A";

    // Inserisci record in Supabase
    const { error } = await supabase.from("previous_close").insert({
      symbol,
      close_value,          // chiusura del giorno appena terminato
      snapshot_date: today, // data odierna
      label,
      lastPrice: close_value,
      previousClose: prevClose,
      lastChange
    });

    if (error) throw error;

    logSuccess(
      `Salvato previousClose per ${symbol}: ${close_value} (prev=${prevClose}, change=${lastChange})`
    );
    res.json({ status: "ok" });
  } catch (err) {
    logError(`Errore salvataggio previousClose: ${err.message}`);
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
