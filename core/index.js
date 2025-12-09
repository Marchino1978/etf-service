// scrapers/index.js
import getVUAA from "../scrapers/vuaa.js";
import getVNGA80 from "../scrapers/vnga80.js";
import getGOLD from "../scrapers/gold.js";
import getXEON from "../scrapers/xeon.js";
// import getISAC from "../scrapers/isac.js";
// import getX13E from "../scrapers/x13e.js";
import getVWCE from "../scrapers/vwce.js";
import getIUSQ from "../scrapers/iusq.js";

// Mappa ETF centralizzata: simbolo → { funzione scraper, label }
export const etfs = {
  VUAA:   { fn: getVUAA,   label: "S&P 500" },
  VNGA80: { fn: getVNGA80, label: "LifeStrategy 80" },
  GOLD:   { fn: getGOLD,   label: "Physical Gold" },
  XEON:   { fn: getXEON,   label: "XEON" },
  // ISAC:   { fn: getISAC,   label: "MSCI All World" },
  // X13E:   { fn: getX13E,   label: "EUR Gov Bond" },
  VWCE:   { fn: getVWCE,   label: "FTSE All World" },
  IUSQ:   { fn: getIUSQ,   label: "MSCI All World" }
};
