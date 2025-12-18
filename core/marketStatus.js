// core/marketStatus.js
import supabase from "./supabaseClient.js";

export default async function handler(req, res) {
  try {
    // Recupera stato mercato da Supabase
    const { data: statusRows, error: statusError } = await supabase
      .from("market_status")
      .select("*")
      .order("datetime", { ascending: false })
      .limit(1);

    if (statusError) throw statusError;
    const statusRow = statusRows?.[0] || null;

    const marketOpen = statusRow?.open ?? false;
    const marketStatus = statusRow?.status ?? "CHIUSO";

    // Recupera dati ETF (snapshot precedenti)
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
    const output = Object.values(latestBySymbol).map((etf) => {
      let price, previousClose, dailyChange;

      if (marketOpen) {
        // Mercato aperto → prezzo live + variazione calcolata
        price = etf.close_value;
        previousClose = etf.close_value; // chiusura del giorno prima
        dailyChange = "N/A"; // calcolato altrove a mercato aperto
      } else {
        // Mercato chiuso → snapshot salvato
        price = etf.close_value;
        previousClose = etf.close_value;
        dailyChange = "N/A"; // ultima variazione salvata
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
