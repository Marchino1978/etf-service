// core/marketStatus.js
import supabase from "./supabaseClient.js";

export default async function handler(req, res) {
  try {
    // Recupera dati ETF dal previous_close
    const { data: etfRows, error: etfError } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date, label")
      .order("snapshot_date", { ascending: false });

    if (etfError) throw etfError;
    if (!Array.isArray(etfRows)) {
      return res.status(500).json({ error: "Nessun dato ETF disponibile" });
    }

    // Mappa per simbolo → ultima entry
    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    // Costruisci output
    const output = Object.values(latestBySymbol).map((etf) => ({
      symbol: etf.symbol,
      label: etf.label,
      price: etf.close_value,        // prezzo di chiusura salvato alle 23:30
      previousClose: etf.close_value, // stesso valore, usato come riferimento
      dailyChange: "N/A"              // variazione calcolata altrove
    }));

    res.status(200).json({
      datetime: new Date().toISOString(),
      status: "CHIUSO", // sempre chiuso alle 23:30
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
