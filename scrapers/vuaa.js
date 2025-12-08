import { createScraper } from "../core/utils.js";
export default function getVUAA() {
  return createScraper("VUAA", "https://www.ls-tc.de/de/etf/1045562", "1045562");
}
