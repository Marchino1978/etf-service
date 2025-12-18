// api/market-status.js
import supabase from "../core/supabaseClient.js";

export default async function handler(req, res) {
  try {
    // Recupera stato mercato da Supabase
    const { data: statusRow } = await supabase
      .from("market_status")
      .select("*")
      .order("datetime", { ascending: false })
      .limit(1);

    const marketOpen = statusRow?.open ?? false;
    const marketStatus = statusRow?.status ?? "CHIUSO";

    // Recupera dati ETF
    const { data: etfRows } = await supabase
      .from("etf_prices")
      .select("*")
      .order("date", { ascending: false });

    // Mappa per simbolo → ultima entry
    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    // Costruisci output
    const output = Object.values(latestBySymbol).map((etf) => {
      let price, previousClose, dailyChange;

      if (marketOpen) {
        price = etf.price;
        previousClose = etf.previousClose; // salvato dal cron il giorno prima
        dailyChange = previousClose
          ? (((price - previousClose) / previousClose) * 100).toFixed(2)
          : "N/A";
      } else {
        price = etf.lastPrice; // ultimo prezzo salvato
        previousClose = etf.previousClose; // quello del giorno prima
        dailyChange = etf.lastChange; // ultima variazione salvata
      }

      return {
        symbol: etf.symbol,
        label: etf.label,
        price,
        previousClose,
        dailyChange,
      };
    });

    res.status(200).json({
      datetime: statusRow?.datetime,
      status: marketStatus,
      open: marketOpen,
      values: {
        source: marketOpen ? "live" : "previous-close",
        data: output,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
