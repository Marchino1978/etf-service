import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function getGOLD() {
  const url = "https://www.ls-tc.de/en/etf/979663";
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  return {
    mid: $('span[source="lightstreamer"][table="quotes"][item="979663@1"][field="mid"]').text().trim(),
    bid: $('span[source="lightstreamer"][table="quotes"][item="979663@1"][field="bid"]').text().trim(),
    ask: $('span[source="lightstreamer"][table="quotes"][item="979663@1"][field="ask"]').text().trim(),
    change: $('span[source="lightstreamer"][table="quotes"][item="979663@1"][field="change"]').text().trim()
  };
}
