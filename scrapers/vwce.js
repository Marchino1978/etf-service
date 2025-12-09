import { createScraper } from "../core/utils.js";
export default function getVWCE() {
  return createScraper("VWCE", "https://www.ls-tc.de/de/etf/1045625", "1045625");
}
