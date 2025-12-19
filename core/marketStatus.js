// core/marketStatus.js
import supabase from "./supabaseClient.js";

export default async function handler(req, res) {
  try {
    // Recupera dati ETF dal previous_close (ordinati per data decrescente)
    const { data: etfRows, error: etfError } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date, label")
      .order("snapshot_date", { ascending: false });

    if (etfError) throw etfError;
    if (!Array.isArray(etfRows) || etfRows.length === 0) {
      return res.status(500).json({ error: "Nessun dato ETF disponibile" });
    }

    // Raggruppa per simbolo → prendi ultimo e penultimo record
    const grouped = {};
    for (const row of etfRows) {
      if (!grouped[row.symbol]) {
        grouped[row.symbol] = { latest: row, previous: null };
      } else if (!grouped[row.symbol].previous) {
        grouped[row.symbol].previous = row;
      }
    }

    // Costruisci output con variazione giornaliera
    const output = Object.values(grouped).map(({ latest, previous }) => {
      const price = latest.close_value;
      const previousClose = previous ? previous.close_value : null;

      let dailyChange = null;
      if (previousClose !== null && previousClose !== 0) {
        dailyChange = (((price - previousClose) / previousClose) * 100).toFixed(2);
      }

      return {
        symbol: latest.symbol,
        label: latest.label,
        price,
        previousClose,
        dailyChange,
      };
    });

    res.status(200).json({
      datetime: new Date().toISOString(),
      status: "CHIUSO", // cron alle 23:30 → mercato chiuso
      open: false,
      values: {
        source: "previous-close",
        data: output,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
