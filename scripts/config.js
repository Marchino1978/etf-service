// scripts/config.js
import { DateTime } from 'luxon';

export const config = {
  // Unico mercato: EU (LS‑TC)
  marketHours: {
    EU: { timezone: 'Europe/Rome', open: '07:20', close: '23:00' }
  },

  // Intervallo aggiornamento updater
  updateIntervalMin: 15
};

// Festività italiane fisse (senza anno)
const fixedHolidaysEU = [
  { month: 1, day: 1 },   // Capodanno
  { month: 5, day: 1 },   // Festa del lavoro
  { month: 8, day: 15 },  // Ferragosto
  { month: 12, day: 24 }, // Vigilia di Natale
  { month: 12, day: 25 }, // Natale
  { month: 12, day: 26 }, // Santo Stefano
  { month: 12, day: 31 }  // Ultimo dell'anno
];

// Calcolo Pasqua (algoritmo di Meeus)
function easterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return DateTime.local(year, month, day);
}

function pasquettaDate(year) {
  return easterDate(year).plus({ days: 1 });
}

function goodFridayDate(year) {
  return easterDate(year).minus({ days: 2 });
}

// Versione semplificata: mercato unico EU, niente simboli
export function isMarketOpen(now = DateTime.now()) {
  const market = config.marketHours.EU;
  const local = now.setZone(market.timezone);

  // weekend (6 = sabato, 7 = domenica)
  if ([6, 7].includes(local.weekday)) return false;

  // festività EU fisse
  if (fixedHolidaysEU.some(h => h.month === local.month && h.day === local.day)) {
    return false;
  }

  // Pasqua, Pasquetta e Venerdì Santo
  const easter = easterDate(local.year);
  const pasquetta = pasquettaDate(local.year);
  const goodFriday = goodFridayDate(local.year);
  if (
    local.hasSame(easter, 'day') ||
    local.hasSame(pasquetta, 'day') ||
    local.hasSame(goodFriday, 'day')
  ) {
    return false;
  }

  // orari di apertura LS-TC
  const [oH, oM] = market.open.split(':').map(Number);
  const [cH, cM] = market.close.split(':').map(Number);

  const openDT = local.set({ hour: oH, minute: oM });
  const closeDT = local.set({ hour: cH, minute: cM });

  return local >= openDT && local <= closeDT;
}
