import { createScraper } from "../core/utils.js";
export default function getISAC() {
  return createScraper("ISAC", "https://www.ls-tc.de/de/etf/270966", "270966");
}
