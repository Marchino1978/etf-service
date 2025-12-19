// scripts/savePreviousClose.js
import supabase from "../core/supabaseClient.js";
import fetchEtfData from "./fetchEtfData.js";

export default async function savePreviousClose() {
  try {
    const etfData = await fetchEtfData();
    const today = new Date().toISOString().slice(0, 10);

    for (const etf of etfData) {
      const { symbol, label, close_value } = etf;
      const current = Number(close_value);

      if (Number.isNaN(current)) {
        console.error(`Valore non valido per ${symbol}`);
        continue;
      }

      const roundedClose = Number(current.toFixed(2));

      const { data: prevRows, error: prevError } = await supabase
        .from("previous_close")
        .select("close_value")
        .eq("symbol", symbol)
        .lt("snapshot_date", today)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (prevError) {
        console.error(`Errore lettura previousClose per ${symbol}: ${prevError.message}`);
        continue;
      }

      let dailyChange = null;

      if (prevRows && prevRows.length > 0) {
        const prev = Number(prevRows[0].close_value);

        if (!Number.isNaN(prev) && prev !== 0) {
          dailyChange = ((roundedClose - prev) / prev) * 100;
          dailyChange = Number(dailyChange.toFixed(2));
        }
      }

      const { error: upsertError } = await supabase
        .from("previous_close")
        .upsert(
          {
            symbol,
            label,
            close_value: roundedClose,
            snapshot_date: today,
            daily_change: dailyChange
          },
          { onConflict: ["symbol", "snapshot_date"] }
        );

      if (upsertError) {
        console.error(`Errore salvataggio previousClose per ${symbol}: ${upsertError.message}`);
        continue;
      }

      console.log(
        `Salvato ${symbol} @ ${today} -> close=${roundedClose}, change=${dailyChange !== null ? dailyChange : "N/A"}`
      );
    }

    console.log("Snapshot completato.");
  } catch (err) {
    console.error("Errore generale savePreviousClose:", err.message);
  }
}
