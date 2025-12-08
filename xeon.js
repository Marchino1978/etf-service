import { createScraper } from "./utils.js";
export default function getXEON() {
  return createScraper("XEON", "https://www.ls-tc.de/de/etf/58124", "58124");
}
