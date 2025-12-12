import { createScraper } from "../core/utils.js";
export default function getXUSE() {
  return createScraper("XUSE", "https://www.ls-tc.de/de/etf/3549824", "3549824");
}
