// core/marketStatus.js
import supabase from "./supabaseClient.js";

export default async function handler(req, res) {
  try {
    // Legge solo i campi esistenti + daily_change
    const { data: etfRows, error } = await supabase
      .from("previous_close")
      .select("symbol, label, close_value, snapshot_date, daily_change")
      .order("snapshot_date", { ascending: false });

    if (error) throw error;
    if (!Array.isArray(etfRows) || etfRows.length === 0) {
      return res.status(500).json({ error: "Nessun dato ETF disponibile" });
    }

    // Ultima riga per simbolo
    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) latestBySymbol[row.symbol] = row;
    }

    const output = Object.values(latestBySymbol).map((etf) => ({
      symbol: etf.symbol,
      label: etf.label,
      price: Number(etf.close_value).toFixed(2),
      previousClose: Number(etf.close_value).toFixed(2),
      dailyChange: etf.daily_change === null ? "N/A" : Number(etf.daily_change).toFixed(2),
      snapshotDate: etf.snapshot_date
    }));

    // Mercato CHIUSO → nessun calcolo, solo dati salvati
    res.status(200).json({
      datetime: new Date().toISOString(),
      status: "CHIUSO",
      open: false,
      values: { source: "previous-close", data: output }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
