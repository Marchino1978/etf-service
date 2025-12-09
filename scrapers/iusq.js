import { createScraper } from "../core/utils.js";
export default function getIUSQ() {
  return createScraper("IUSQ", "https://www.ls-tc.de/de/etf/270966", "270966");
}
