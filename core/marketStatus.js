// core/marketStatus.js
import supabase from "./supabaseClient.js";

export default async function handler(req, res) {
  try {
    // Recupera dati ETF dal previous_close (ordinati per data decrescente)
    const { data: etfRows, error: etfError } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date, label, daily_change")
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

    // Costruisci output con arrotondamento a 2 decimali
    const output = Object.values(latestBySymbol).map((etf) => ({
      symbol: etf.symbol,
      label: etf.label,
      price: etf.close_value ? Number(etf.close_value).toFixed(2) : null,
      previousClose: etf.close_value ? Number(etf.close_value).toFixed(2) : null,
      dailyChange: etf.daily_change !== undefined && etf.daily_change !== null
        ? Number(etf.daily_change).toFixed(2)
        : null,
    }));

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
