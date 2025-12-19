// core/marketStatus.js
import supabase from "./supabaseClient.js";
import { isMarketOpen } from "../scripts/config.js";
import { getAllPrices } from "./store.js";

export default async function handler(req, res) {
  try {
    const marketIsOpen = isMarketOpen();

    // MERCATO APERTO → usa dati LS-TC (store.js)
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

    // MERCATO CHIUSO → prezzo da store.js, previousClose da Supabase, dailyChange da store.js
    const live = getAllPrices(); // contiene dailyChange e ultimo prezzo LS-TC

    const { data: etfRows, error: etfError } = await supabase
      .from("previous_close")
      .select("symbol, close_value, snapshot_date, label")
      .order("snapshot_date", { ascending: false });

    if (etfError) throw etfError;

    const latestBySymbol = {};
    for (const row of etfRows) {
      if (!latestBySymbol[row.symbol]) {
        latestBySymbol[row.symbol] = row;
      }
    }

    const output = Object.values(latestBySymbol).map(etf => {
      const liveData = live[etf.symbol];

      return {
        symbol: etf.symbol,
        label: etf.label,
        // prezzo: se LS-TC ha un valore più recente, usalo
        price: liveData?.mid ?? liveData?.price ?? Number(etf.close_value).toFixed(2),
        previousClose: Number(etf.close_value).toFixed(2),
        // dailyChange reale da store.js
        dailyChange: liveData?.dailyChange ?? "0.00",
        snapshotDate: etf.snapshot_date
      };
    });

    return res.status(200).json({
      datetime: new Date().toISOString(),
      status: "CHIUSO",
      open: false,
      values: {
        source: "previous-close + store",
        data: output
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
