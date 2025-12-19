// scripts/savePreviousClose.js
import supabase from "../core/supabaseClient.js";
import fetchEtfData from "./fetchEtfData.js"; // funzione che recupera i dati live

export default async function savePreviousClose() {
  try {
    const etfData = await fetchEtfData();

    for (const etf of etfData) {
      const { symbol, label, close_value } = etf;
      const roundedClose = Number(close_value).toFixed(2);

      // recupera ultimo record precedente
      const { data: prevRows, error: prevError } = await supabase
        .from("previous_close")
        .select("close_value")
        .eq("symbol", symbol)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (prevError) throw prevError;

      let dailyChange = null;
      if (prevRows && prevRows.length > 0) {
        const prevClose = Number(prevRows[0].close_value);
        if (prevClose !== 0) {
          dailyChange = (((roundedClose - prevClose) / prevClose) * 100).toFixed(2);
        }
      }

      // inserisci record
      const { error: insertError } = await supabase
        .from("previous_close")
        .insert([
          {
            symbol,
            label,
            close_value: roundedClose,
            snapshot_date: new Date().toISOString(),
            // dailyChange non è una colonna: lo salvi solo in memoria/log
          },
        ]);

      if (insertError) throw insertError;

      console.log(
        `Salvato ${symbol}: prezzo=${roundedClose}, variazione=${dailyChange ?? "N/A"}`
      );
    }

    console.log("Snapshot completato alle 23:30");
  } catch (err) {
    console.error("Errore nel salvataggio snapshot:", err.message);
  }
}
