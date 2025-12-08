import { createScraper } from "./utils.js";
export default function getVNGA80() {
  return createScraper("VNGA80", "https://www.ls-tc.de/en/etf/1376226", "1376226");
}
