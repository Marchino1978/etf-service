import { config, isMarketOpen } from './config.js';
import { fetchQuote } from './provider.js';
import { setQuote } from './store.js';

export async function runUpdateCycle(logger = console) {
  if (!isMarketOpen()) {
    logger.info('[updater] Mercato chiuso');
    return;
  }
  for (const t of config.tickers) {
    try {
      const q = await fetchQuote(t.symbol);
      setQuote(t.symbol, { ...q, symbol: t.symbol, isin: t.isin, name: t.name });
      logger.info(`[updater] Aggiornato ${t.symbol}`);
    } catch (err) {
      logger.error(`[updater] Errore ${t.symbol}: ${err.message}`);
    }
  }
}
