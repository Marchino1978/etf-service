// scripts/savePreviousClose.js
import supabase from "../core/supabaseClient.js";
import fetchEtfData from "./fetchEtfData.js";

export default async function savePreviousClose() {
  try {
    const etfData = await fetchEtfData();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const etf of etfData) {
      const { symbol, label, close_value } = etf;
      const current = Number(close_value);

      // Recupera penultimo valore per calcolare la variazione
      const { data: prevRows, error: prevError } = await supabase
        .from("previous_close")
        .select("close_value, snapshot_date")
        .eq("symbol", symbol)
        .lt("snapshot_date", today)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (prevError) throw prevError;

      let dailyChange = null;
      const prev = prevRows?.[0]?.close_value;
      if (typeof prev === "number" && prev !== 0 && !Number.isNaN(current)) {
        dailyChange = ((current - prev) / prev) * 100; // numero puro
      }

      const { error: upsertError } = await supabase
        .from("previous_close")
        .upsert(
          {
            symbol,
            label,
            close_value: Number(current.toFixed(2)), // due decimali
            snapshot_date: today,                    // SOLO date
            daily_change: dailyChange                // può restare null se primo inserimento
          },
          { onConflict: ["symbol", "snapshot_date"] }
        );

      if (upsertError) throw upsertError;
      console.log(
        `Snapshot ${symbol} @ ${today} → close=${current.toFixed(2)}, change=${dailyChange !== null ? dailyChange.toFixed(2) : "N/A"}`
      );
    }

    console.log("Snapshot completato.");
  } catch (err) {
    console.error("Errore nel salvataggio snapshot:", err.message);
  }
}
