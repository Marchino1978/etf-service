// testDateVar.js
import readline from 'readline';
import { isWeekend, subDays, subMonths, lastDayOfMonth } from 'date-fns';

// Festività fisse italiane (giorno/mese)
const fixedHolidays = [
  '01-01', '04-25', '05-01', '06-02',
  '08-15', '12-25', '12-26'
];

// Calcolo Pasqua (algoritmo di Gauss semplificato)
function easterDate(year) {
  const f = Math.floor,
    a = year % 19,
    b = f(year / 100),
    c = year % 100,
    d = f(b / 4),
    e = b % 4,
    g = f((8 * b + 13) / 25),
    h = (19 * a + b - d - g + 15) % 30,
    i = f(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = f((a + 11 * h + 22 * l) / 451),
    month = f((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function easterMonday(year) {
  const pasqua = easterDate(year);
  return new Date(pasqua.getFullYear(), pasqua.getMonth(), pasqua.getDate() + 1);
}

// Genera lista festività per un anno
function holidays(year) {
  const list = fixedHolidays.map(h => {
    const [mm, dd] = h.split('-');
    return new Date(`${year}-${mm}-${dd}T00:00:00`);
  });
  list.push(easterDate(year));
  list.push(easterMonday(year));
  return list.map(d => d.toISOString().split('T')[0]);
}

// Controlla se data è festiva
function isHoliday(date, yearHolidays) {
  const iso = date.toISOString().split('T')[0];
  return yearHolidays.includes(iso);
}

// Trova giorno lavorativo precedente
function previousBusinessDay(date, yearHolidays) {
  let d = new Date(date);
  do {
    d.setDate(d.getDate() - 1);
  } while (isWeekend(d) || isHoliday(d, yearHolidays));
  return d;
}

// Calcola target per 1m/3m
function getTargetDate(today, monthsBack = 1) {
  const yearHolidays = holidays(today.getFullYear());
  const target = subMonths(today, monthsBack);
  const day = today.getDate();
  const daysInTargetMonth = lastDayOfMonth(target).getDate();

  let candidate;
  if (day <= daysInTargetMonth) {
    candidate = new Date(target.getFullYear(), target.getMonth(), day);
  } else {
    candidate = lastDayOfMonth(target);
  }

  if (isWeekend(candidate) || isHoliday(candidate, yearHolidays)) {
    candidate = previousBusinessDay(candidate, yearHolidays);
  }
  return candidate;
}

// Calcola target per 1d/5d
function getTargetDays(today, daysBack) {
  const yearHolidays = holidays(today.getFullYear());
  let candidate = subDays(today, daysBack);
  if (isWeekend(candidate) || isHoliday(candidate, yearHolidays)) {
    candidate = previousBusinessDay(candidate, yearHolidays);
  }
  return candidate;
}

// Formatter italiano (giorno + mese esteso)
function formatItalian(date) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

// ----------------------
// Programma interattivo
// ----------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Seleziona modalità:");
console.log("1 = Usa data odierna");
console.log("2 = Inserisci data (dd-mm-aaaa)");

rl.question("Scelta: ", (choice) => {
  let today;
  if (choice.trim() === "1") {
    today = new Date();
  } else {
    rl.question("Inserisci data (dd-mm-aaaa): ", (inputDate) => {
      const [dd, mm, yyyy] = inputDate.split("-");
      today = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      runCalc(today);
      rl.close();
    });
    return;
  }
  runCalc(today);
  rl.close();
});

function runCalc(today) {
  console.log("\nData di calcolo:", formatItalian(today));

  const d1 = getTargetDays(today, 1);
  const d5 = getTargetDays(today, 5);
  const m1 = getTargetDate(today, 1);
  const m3 = getTargetDate(today, 3);

  console.log("Data -1 giorno:", formatItalian(d1));
  console.log("Data -5 giorni:", formatItalian(d5));
  console.log("Data -1 mese:", formatItalian(m1));
  console.log("Data -3 mesi:", formatItalian(m3));
}
