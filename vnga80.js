import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function getVNGA80() {
  const url = "https://www.ls-tc.de/en/etf/1376226";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  return {
    mid: $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="mid"]').text().trim(),
    bid: $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="bid"]').text().trim(),
    ask: $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="ask"]').text().trim(),
    change: $('span[source="lightstreamer"][table="quotes"][item="1376226@1"][field="change"]').text().trim()
  };
}
