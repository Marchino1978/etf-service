// core/updater.js
import { etfs } from "../core/index.js";   // mappa ETF centralizzata
import { savePrice } from "../core/store.js";
import supabase from "./supabaseClient.js";
import { logInfo, logSuccess, logWarn, logError } from "./logger.js";

async function upsertSnapshot(symbol, price, label) {
  if (!supabase || typeof price !== "number") return { status: "no-supabase" };

  // Usa solo la data (YYYY-MM-DD) per snapshot_date
  const today = new Date().toISOString().split("T")[0];

  const payload = {
    symbol,
    close_value: price,
    snapshot_date: today,
    label
  };

  const { error } = await supabase
    .from("previous_close")
    .upsert(payload, { onConflict: ["symbol", "snapshot_date"] });

  if (error) {
    logError(`Errore upsert Supabase per ${symbol}: ${error.message}`);
    return { status: "supabase-error" };
  }
  logSuccess(`Snapshot salvato per ${symbol} (${today})`);

  // 🔎 Calcolo variazione rispetto all’ultimo record precedente
  let prevValue = null;
  let dailyChange = null;

  try {
    const { data: prevRows, error: prevError } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .lt("snapshot_date", today) // esclude lo snapshot di oggi
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (prevError) {
      logError(`Errore fetch previous per ${symbol}: ${prevError.message}`);
    }

    if (prevRows && prevRows.length > 0) {
      prevValue = prevRows[0].close_value;
      if (prevValue !== 0) {
        dailyChange = ((price - prevValue) / prevValue) * 100;
        logSuccess(
          `DailyChange per ${symbol}: ${dailyChange.toFixed(2)} % (vs ${prevRows[0].snapshot_date})`
        );
      } else {
        logWarn(`DailyChange non calcolabile per ${symbol}: previousClose = 0`);
      }
    } else {
      logInfo(`Nessun record precedente per ${symbol} (primo inserimento)`);
    }
  } catch (err) {
    logError(`Errore calcolo dailyChange per ${symbol}: ${err.message}`);
  }

  // ritorna anche i valori calcolati
  return { status: "ok", previousClose: prevValue, dailyChange };
}

async function updateAll() {
  logInfo("Avvio aggiornamento ETF...");
  const results = [];

  for (const [symbol, { fn, label }] of Object.entries(etfs)) {
    try {
      const data = await fn();

      // Salva snapshot giornaliero su Supabase + calcolo dailyChange
      const r = await upsertSnapshot(symbol, data?.price, label);

      // Salva nello store locale (per uso runtime) con dailyChange e previousClose
      await savePrice(symbol, { 
        ...data, 
        label, 
        previousClose: r.previousClose ?? null,
        dailyChange: r.dailyChange !== null ? Number(r.dailyChange.toFixed(2)) : null
      });

      results.push({ symbol, status: r.status });
    } catch (err) {
      if (err?.response?.status === 429) {
        logWarn(`${symbol}: rate limit (429), mantengo dati esistenti`);
        results.push({ symbol, status: "rate-limited" });
      } else {
        logError(`${symbol}: errore durante scraping → ${err.message}`);
        results.push({ symbol, status: "error" });
      }
    }
  }

  if (process.env.NODE_ENV !== "test") {
    logInfo(`Risultato aggiornamento: ${JSON.stringify(results)}`);
  }
