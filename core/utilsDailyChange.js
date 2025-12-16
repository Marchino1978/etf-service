// core/utilsDailyChange.js
import supabase from "./supabaseClient.js";

export async function calcDailyChange(symbol, currentPrice) {
  if (!supabase || typeof currentPrice !== "number") return "N/A";

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .lt("snapshot_date", today)              // solo date < oggi
      .not("close_value", "is", null)         // esclude valori null
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return "N/A";

    const prevClose = Number(data[0].close_value);
    if (isNaN(prevClose)) return "N/A";

    const variation = ((currentPrice - prevClose) / prevClose) * 100;
    return `${variation.toFixed(2)} %`;
  } catch (err) {
    console.error(`Errore calcolo dailyChange per ${symbol}: ${err.message}`);
    return "N/A";
  }
}
