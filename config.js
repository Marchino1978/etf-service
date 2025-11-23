import { DateTime } from 'luxon';

export const config = {
  tickers: [
    { symbol: 'VUAA.MI', isin: 'IE00BFMXXD54', name: 'Vanguard S&P 500 UCITS ETF (USD) Acc' },
    { symbol: 'VNGA80.MI', isin: 'IE00BMVB5R75', name: 'Vanguard LifeStrategy 80% Equity UCITS ETF (EUR) Acc' },
    { symbol: 'GOLD.MI', isin: 'FR0013416716', name: 'Amundi Physical Gold ETC (C)' }
  ],
  marketHours: {
    timezone: 'Europe/Rome',
    open: '09:00',
    close: '17:30'
  },
  holidays: ['2025-01-01','2025-04-21','2025-05-01','2025-08-15','2025-12-25','2025-12-26'],
  updateIntervalMin: 15
};

export function isMarketOpen(now = DateTime.now()) {
  const { timezone, open, close } = config.marketHours;
  const local = now.setZone(timezone);
  if ([6,7].includes(local.weekday)) return false;
  if (config.holidays.includes(local.toISODate())) return false;
  const [oH,oM] = open.split(':').map(Number);
  const [cH,cM] = close.split(':').map(Number);
  const openDT = local.set({hour:oH,minute:oM});
  const closeDT = local.set({hour:cH,minute:cM});
  return local >= openDT && local <= closeDT;
}
