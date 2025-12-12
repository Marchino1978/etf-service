// scrapers/index.js
import getVUAA from "../scrapers/vuaa.js";
import getVNGA80 from "../scrapers/vnga80.js";
import getGOLD from "../scrapers/gold.js";
import getXEON from "../scrapers/xeon.js";
import getVWCE from "../scrapers/vwce.js";
// import getISAC from "../scrapers/isac.js";
// import getX13E from "../scrapers/x13e.js";
// import getIUSQ from "../scrapers/iusq.js";
import getSWDA from "../scrapers/swda.js";
import getXUSE from "../scrapers/xuse.js";
import getEXUS from "../scrapers/exus.js";

// Mappa ETF centralizzata: simbolo → { funzione scraper, label }
export const etfs = {
  VUAA:   { fn: getVUAA,   label: "S&P 500" },
  VNGA80: { fn: getVNGA80, label: "LifeStrategy 80" },
  GOLD:   { fn: getGOLD,   label: "Physical Gold" },
  XEON:   { fn: getXEON,   label: "XEON" },
  VWCE:   { fn: getVWCE,   label: "FTSE All World" },
  // ISAC:   { fn: getISAC,   label: "MSCI All World" },
  // X13E:   { fn: getX13E,   label: "EUR Gov Bond" },
  // IUSQ:   { fn: getIUSQ,   label: "MSCI All World" },
  SWDA:   { fn: getSWDA,   label: "Core MSCI World" },
  XUSE:   { fn: getXUSE,   label: "MSCI Worls Ex-USA" },
  EXUS:   { fn: getEXUS,   label: "MSCI Worls Ex-USA" }
};
