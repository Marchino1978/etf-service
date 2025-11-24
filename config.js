import { DateTime } from 'luxon';

export const config = {
  tickers: [
    { symbol: 'VUAA.MI', isin: 'IE00BFMXXD54', name: 'Vanguard S&P 500 UCITS ETF (USD) Acc', market: 'EU' },
    { symbol: 'VNGA80.MI', isin: 'IE00BMVB5R75', name: 'Vanguard LifeStrategy 80% Equity UCITS ETF (EUR) Acc', market: 'EU' },
    { symbol: 'GOLD.MI', isin: 'FR0013416716', name: 'Amundi Physical Gold ETC (C)', market: 'EU' },

    { symbol: 'SPY', isin: 'US78462F1030', name: 'SPDR S&P 500 ETF Trust', market: 'US' },
    { symbol: 'QQQ', isin: 'US46090E1038', name: 'Invesco QQQ Trust (Nasdaq 100)', market: 'US' },
    { symbol: 'AAPL', isin: 'US0378331005', name: 'Apple Inc.', market: 'US' }
  ],
  marketHours: {
    EU: { timezone: 'Europe/Rome', open: '09:00', close: '17:30' },
    US: { timezone: 'America/New_York', open: '09:30', close: '16:00' } // orari NYSE/Nasdaq
  },
  holidays: ['2025-01-01','2025-04-21','2025-05-01','2025-08-15','2025-12-25','2025-12-26'],
  updateIntervalMin: 15
};

export function isMarketOpen(symbol, now = DateTime.now()) {
  const ticker = config.tickers.find(t => t.symbol === symbol);
  if (!ticker) return false;

  const market = config.marketHours[ticker.market];
  const local = now.setZone(market.timezone);

  // weekend
  if ([6,7].includes(local.weekday)) return false;

  // holidays (solo EU per semplicità)
  if (ticker.market === 'EU' && config.holidays.includes(local.toISODate())) return false;

  const [oH,oM] = market.open.split(':').map(Number);
  const [cH,cM] = market.close.split(':').map(Number);
  const openDT = local.set({hour:oH,minute:oM});
  const closeDT = local.set({hour:cH,minute:cM});

  return local >= openDT && local <= closeDT;
}
