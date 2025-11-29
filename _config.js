1import { DateTime } from 'luxon';

export const config = {
  tickers: [
    { symbol: 'VUAA.MI', isin: 'IE00BFMXXD54', name: 'Vanguard S&P 500 UCITS ETF (USD) Acc', market: 'EU' },
    { symbol: 'VNGA80.MI', isin: 'IE00BMVB5R75', name: 'Vanguard LifeStrategy 80% Equity UCITS ETF (EUR) Acc', market: 'EU' },
    { symbol: 'GOLD.MI', isin: 'FR0013416716', name: 'Amundi Physical Gold ETC (C)', market: 'EU' }
  ],
  marketHours: {
    EU: { timezone: 'Europe/Rome', open: '09:00', close: '17:30' }
  },
  updateIntervalMin: 15
};

// 🔎 Festività italiane fisse (senza anno)
const fixedHolidaysEU = [
  { month: 1, day: 1 },   // Capodanno
  { month: 5, day: 1 },   // Festa del lavoro
  { month: 8, day: 15 },  // Ferragosto
  { month: 12, day: 25 }, // Natale
  { month: 12, day: 26 }  // Santo Stefano
];

// 🔎 Calcolo Pasqua (algoritmo di Meeus)
function easterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C/4) - f((8*C+13)/25) + 19*G + 15) % 30;
  const I = H - f(H/28)*(1 - f(29/(H+1))*f((21-G)/11));
  const J = (year + f(year/4) + I + 2 - C + f(C/4)) % 7;
  const L = I - J;
  const month = 3 + f((L+40)/44);
  const day = L + 28 - 31*f(month/4);
  return DateTime.local(year, month, day);
}

function pasquettaDate(year) {
  return easterDate(year).plus({ days: 1 });
}

// 🔎 Funzione aggiornata
export function isMarketOpen(symbol, now = DateTime.now()) {
  const ticker = config.tickers.find(t => t.symbol === symbol);
  if (!ticker) return false;

  const market = config.marketHours[ticker.market];
  const local = now.setZone(market.timezone);

  // weekend
  if ([6,7].includes(local.weekday)) return false;

  // festività italiane
  if (fixedHolidaysEU.some(h => h.month === local.month && h.day === local.day)) return false;

  const easter = easterDate(local.year);
  const pasquetta = pasquettaDate(local.year);
  if (local.hasSame(easter, 'day') || local.hasSame(pasquetta, 'day')) return false;

  // orari di apertura
  const [oH,oM] = market.open.split(':').map(Number);
  const [cH,cM] = market.close.split(':').map(Number);
  const openDT = local.set({hour:oH,minute:oM});
  const closeDT = local.set({hour:cH,minute:cM});

  return local >= openDT && local <= closeDT;
}
