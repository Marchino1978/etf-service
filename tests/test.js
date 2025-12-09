import fetch from "node-fetch";

const symbols = ["VUAA", "VNGA80", "GOLD", "XEON", "ISAC", "X13E"];
const baseUrl = "http://localhost:3000/api/etf";

async function testQuotes() {
  console.log("🔎 Test singoli ETF...\n");

  for (const s of symbols) {
    try {
      const res = await fetch(`${baseUrl}/${s}`);
      const data = await res.json();

      if (data.error) {
        console.error(`❌ ${s}: ${data.error}`);
      } else {
        console.log(
          `✅ ${s} [${data.status}] → Prezzo: ${data.price ?? "n/a"} | DailyChange: ${data.dailyChange || "-"}`
        );
      }
    } catch (err) {
      console.error(`❌ Errore nel fetch di ${s}:`, err.message);
    }
  }

  console.log("\n🔎 Test endpoint completo...\n");

  try {
    const allRes = await fetch(baseUrl);
    const allData = await allRes.json();

    for (const [symbol, data] of Object.entries(allData)) {
      console.log(
        `📊 ${symbol} [${data.status}] → Prezzo: ${data.price ?? "n/a"} | DailyChange: ${data.dailyChange || "-"}`
      );
    }
  } catch (err) {
    console.error("❌ Errore nel fetch di tutte le quotes:", err.message);
  }
}

testQuotes();
