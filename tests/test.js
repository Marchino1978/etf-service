// tests/test.js
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });   // <-- carica il file .env dalla root

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const symbols = ["VUAA", "VNGA80", "GOLD", "XEON", "VWCE", "SWDA", "XUSE", "EXUS"];
const baseUrl = process.env.BASE_URL + "/api/etf";

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Configurazione Supabase mancante. Controlla il file .env nella root.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getPreviousClose(symbol) {
  try {
    const { data, error } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.close_value ?? null;
  } catch (err) {
    console.error(`❌ Errore Supabase per ${symbol}:`, err.message);
    return null;
  }
}

function fmtPct(num) {
  return `${Number(num).toFixed(2)} %`;
}

async function testQuotes() {
  console.log("🔎 Test singoli ETF con Supabase...\n");

  for (const s of symbols) {
    try {
      const res = await fetch(`${baseUrl}/${s}`);
      const data = await res.json();

      if (data.error) {
        console.error(`❌ ${s}: ${data.error}`);
        continue;
      }

      const prevClose = await getPreviousClose(s);
      const variation =
        prevClose && typeof data.price === "number"
          ? fmtPct(((data.price - prevClose) / prevClose) * 100)
          : "N/A";

      console.log(
        `✅ ${s} [${data.status}] → Prezzo: ${data.price ?? "n/a"} | DailyChange: ${variation}`
      );
    } catch (err) {
      console.error(`❌ Errore nel fetch di ${s}:`, err.message);
    }
  }

  console.log("\n🔎 Test endpoint completo...\n");

  try {
    const allRes = await fetch(baseUrl);
    const allData = await allRes.json();

    for (const [symbol, data] of Object.entries(allData)) {
      const prevClose = await getPreviousClose(symbol);
      const variation =
        prevClose && typeof data.price === "number"
          ? fmtPct(((data.price - prevClose) / prevClose) * 100)
          : "N/A";

      console.log(
        `📊 ${symbol} [${data.status}] → Prezzo: ${data.price ?? "n/a"} | DailyChange: ${variation}`
      );
    }
  } catch (err) {
    console.error("❌ Errore nel fetch di tutte le quotes:", err.message);
  }
}

testQuotes();
