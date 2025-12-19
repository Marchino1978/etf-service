// core/marketStatus.js
import supabase from "./supabaseClient.js";

export default async function handler(req, res) {
  try {
    const { data: etfRows, error: etfError } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date, label")
      .order("snapshot_date", { ascending: false });

    if (etfError) throw etfError;
    if (!Array.isArray(etfRows) || etfRows.length === 0) {
      return res.status(500).json({ error: "Nessun dato ETF disponibile" });
    }

    // Mappa per simbolo → ultima entry
    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    // Output con arrotondamento a 2 decimali
    const output = Object.values(latestBySymbol).map((etf) => ({
      symbol: etf.symbol,
      label: etf.label,
      price: Number(etf.close_value).toFixed(2),
      previousClose: Number(etf.close_value).toFixed(2),
      // DailyChange non inventato: se vuoi mostrarlo, deve arrivare dal cron
    }));

    res.status(200).json({
      datetime: new Date().toISOString(),
      status: "CHIUSO",
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
