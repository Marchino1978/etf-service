import { createScraper } from "./utils.js";
export default function getGOLD() {
  return createScraper("GOLD", "https://www.ls-tc.de/en/etf/979663", "979663");
}
