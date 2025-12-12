import { createScraper } from "../core/utils.js";
export default function getEXUS() {
  return createScraper("EXUS", "https://www.ls-tc.de/de/etf/3167313", "3167313");
}
