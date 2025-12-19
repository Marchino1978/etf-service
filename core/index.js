// scrapers/index.js
import getVUAA from "../scrapers/vuaa.js";
import getVNGA80 from "../scrapers/vnga80.js";
import getGOLD from "../scrapers/gold.js";
import getXEON from "../scrapers/xeon.js";
import getVWCE from "../scrapers/vwce.js";
// import getISAC from "../scrapers/isac.js";
// import getX13E from "../scrapers/x13e.js";
// import getIUSQ from "../scrapers/iusq.js";
// import getSWDA from "../scrapers/swda.js";
// import getXUSE from "../scrapers/xuse.js";
import getEXUS from "../scrapers/exus.js";

// Mappa ETF centralizzata: simbolo → { funzione scraper, label }
export const etfs = {
  VUAA:   { fn: getVUAA,   label: "S&P 500",           ISIN: "IE00BFMXXD54" },
  VNGA80: { fn: getVNGA80, label: "LifeStrategy 80",   ISIN: "IE00BMVB5R75" },
  GOLD:   { fn: getGOLD,   label: "Physical Gold",     ISIN: "FR0013416716" },
  XEON:   { fn: getXEON,   label: "XEON",              ISIN: "LU0290358497" },
  VWCE:   { fn: getVWCE,   label: "FTSE All World",    ISIN: "IE00BK5BQT80" },
  // ISAC:   { fn: getISAC,   label: "MSCI All World",    ISIN: "IE00B6R52259" },
  // X13E:   { fn: getX13E,   label: "EUR Gov Bond",      ISIN: "LU0290356871" },
  // IUSQ:   { fn: getIUSQ,   label: "MSCI All World",    ISIN: "IE00B6R52259" },
  // SWDA:   { fn: getSWDA,   label: "Core MSCI World",   ISIN: "IE00B4L5Y983" },
  // XUSE:   { fn: getXUSE,   label: "MSCI World Ex-USA", ISIN: "IE000R4ZNTN3" },
  EXUS:   { fn: getEXUS,   label: "MSCI World Ex-USA", ISIN: "IE0006WW1TQ4" }
};