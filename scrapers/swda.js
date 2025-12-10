import { createScraper } from "../core/utils.js";
export default function getSWDA() {
  return createScraper("SWDA", "https://www.ls-tc.de/de/etf/44039", "44039");
}
