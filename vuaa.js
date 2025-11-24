import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function getVUAA() {
  const url = "https://www.ls-tc.de/de/etf/1045562";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  return {
    mid: $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="mid"]').text().trim(),
    bid: $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="bid"]').text().trim(),
    ask: $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="ask"]').text().trim(),
    change: $('span[source="lightstreamer"][table="quotes"][item="1045562@1"][field="change"]').text().trim()
  };
}

// Se eseguito direttamente, stampa i dati
if (import.meta.url === `file://${process.argv[1]}`) {
  getVUAA().then(data => console.log("VUAA:", data));
}