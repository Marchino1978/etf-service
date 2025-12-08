import { createScraper } from "./utils.js";
export default function getX13E() {
  return createScraper("X13E", "https://www.ls-tc.de/de/etf/46985", "46985");
}
