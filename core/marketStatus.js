// core/marketStatus.js
import supabase from "./supabaseClient.js";
import { isMarketOpen } from "../scripts/config.js";
import { getAllPrices } from "./store.js";

export default async function handler(req, res) {
  try {
    const marketIsOpen = isMarketOpen();

    // Se il mercato è APERTO → usiamo i dati in memoria (LS-TC)
    if (marketIsOpen) {
      const live = getAllPrices();
      const output = Object.keys(live).map(symbol => {
        const etf = live[symbol];
        return {
          symbol,
          label: etf.label,
          price: etf.mid ?? etf.price ?? null,
          previousClose: etf.previousClose ?? null,
          dailyChange: etf.dailyChange ?? "0.00",
          snapshotDate: etf.updatedAt
        };
      });

      return res.status(200).json({
        datetime: new Date().toISOString(),
        status: "APERTO",
        open: true,
        values: {
          source: "live",
          data: output
        }
      });
    }

    // Se il mercato è CHIUSO → usiamo Supabase (ultimo cronjob)
    const { data: etfRows, error: etfError } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date, label")
      .order("snapshot_date", { ascending: false });

    if (etfError) throw etfError;

    if (!Array.isArray(etfRows) || etfRows.length === 0) {
      return res.status(500).json({ error: "Nessun dato ETF disponibile" });
    }

    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    const output = Object.values(latestBySymbol).map(etf => ({
      symbol: etf.symbol,
      label: etf.label,
      price: Number(etf.close_value).toFixed(2),
      previousClose: Number(etf.close_value).toFixed(2),
      dailyChange: "0.00", // mercato chiuso → variazione congelata
      snapshotDate: etf.snapshot_date
    }));

    return res.status(200).json({
      datetime: new Date().toISOString(),
      status: "CHIUSO",
      open: false,
      values: {
        source: "previous-close",
        data: output
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
