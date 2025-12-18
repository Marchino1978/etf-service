# tests//compare.sh
----------------------------------------
~~~
#!/bin/bash
# Confronto tra valori salvati in previousClose.json e prezzi correnti live su Render

BASE_URL="https://etf-service.onrender.com/api"

echo "Confronto ETF vs previousClose (Render)"

# Scarica i dati dai due endpoint
PREV=$(curl -s "$BASE_URL/previous-close")
LIVE=$(curl -s "$BASE_URL/etf")

# Cicla su tutti i simboli presenti nel live
for SYMBOL in $(echo "$LIVE" | jq -r 'keys[]'); do
  PREV_VAL=$(echo "$PREV" | jq -r --arg S "$SYMBOL" '.[$S].value // empty')
  CURR_VAL=$(echo "$LIVE" | jq -r --arg S "$SYMBOL" '.[$S].price // empty')
  DAILY=$(echo "$LIVE" | jq -r --arg S "$SYMBOL" '.[$S].dailyChange // empty')

  if [ -n "$PREV_VAL" ] && [ -n "$CURR_VAL" ]; then
    echo "$SYMBOL: previous=$PREV_VAL, current=$CURR_VAL, dailyChange=$DAILY"
  else
    echo "$SYMBOL: dati mancanti"
  fi
done
~~~


# tests//simulate.js
----------------------------------------
~~~
import fetch from "node-fetch";

const baseUrl = "https://etf-service.onrender.com/api/etf";

async function simulateESP32() {
  try {
    const res = await fetch(baseUrl);
    const data = await res.json();

    // Stampa solo simbolo e prezzo, come farebbe un microcontroller
    for (const [symbol, info] of Object.entries(data)) {
      console.log(`${symbol}: prezzo=${info.price}€, dailyChange=${info.dailyChange}`);
    }
  } catch (err) {
    console.error("Errore nella simulazione ESP32:", err.message);
  }
}

simulateESP32();
~~~


# tests//testDateVar.js
----------------------------------------
~~~
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
~~~


# tests//testEaster.js
----------------------------------------
~~~
import readline from 'readline';
import { DateTime } from 'luxon';

// Calcolo Pasqua (algoritmo di Meeus)
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

// Interfaccia per chiedere l’anno
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Inserisci un anno: ', (answer) => {
  const year = parseInt(answer);
  if (isNaN(year)) {
    console.log('Devi inserire un numero valido.');
  } else {
    const easter = easterDate(year);
    const pasquetta = pasquettaDate(year);
    console.log(`Pasqua ${year}: ${easter.toISODate()}`);
    console.log(`Pasquetta ${year}: ${pasquetta.toISODate()}`);
  }
  rl.close();
});
~~~


# tests//test.js
----------------------------------------
~~~
// tests/test.js
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });   // <-- carica il file .env dalla root

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const symbols = ["VUAA", "VNGA80", "GOLD", "XEON", "VWCE", "SWDA", "XUSE", "EXUS"];
const baseUrl = process.env.BASE_URL + "/api/etf";

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Configurazione Supabase mancante. Controlla il file .env nella root.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getPreviousClose(symbol) {
  try {
    const { data, error } = await supabase
      .from("previous_close")
      .select("close_value, snapshot_date")
      .eq("symbol", symbol)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.close_value ?? null;
  } catch (err) {
    console.error(`Errore Supabase per ${symbol}:`, err.message);
    return null;
  }
}

function fmtPct(num) {
  return `${Number(num).toFixed(2)} %`;
}

async function testQuotes() {
  console.log("Test singoli ETF con Supabase...\n");

  for (const s of symbols) {
    try {
      const res = await fetch(`${baseUrl}/${s}`);
      const data = await res.json();

      if (data.error) {
        console.error(`${s}: ${data.error}`);
        continue;
      }

      const prevClose = await getPreviousClose(s);
      const variation =
        prevClose && typeof data.price === "number"
          ? fmtPct(((data.price - prevClose) / prevClose) * 100)
          : "N/A";

      console.log(
        `${s} [${data.status}] → Prezzo: ${data.price ?? "n/a"} | DailyChange: ${variation}`
      );
    } catch (err) {
      console.error(`Errore nel fetch di ${s}:`, err.message);
    }
  }

  console.log("\nTest endpoint completo...\n");

  try {
    const allRes = await fetch(baseUrl);
    const allData = await allRes.json();

    for (const [symbol, data] of Object.entries(allData)) {
      const prevClose = await getPreviousClose(symbol);
      const variation =
        prevClose && typeof data.price === "number"
          ? fmtPct(((data.price - prevClose) / prevClose) * 100)
          : "N/A";

      console.log(
        `${symbol} [${data.status}] → Prezzo: ${data.price ?? "n/a"} | DailyChange: ${variation}`
      );
    }
  } catch (err) {
    console.error("Errore nel fetch di tutte le quotes:", err.message);
  }
}

testQuotes();
~~~


# tests//test.sh
----------------------------------------
~~~
#!/bin/bash
export NODE_ENV=test

ROOT_DIR="$(dirname "$(pwd)")"
SERVER_JS="$ROOT_DIR/core/server.js"
PORT=${PORT:-3000}

echo "ROOT_DIR: $ROOT_DIR"
echo "SERVER_JS: $SERVER_JS"
echo "PORT: $PORT"

# Avvia il server in background e salva il PID
node "$SERVER_JS" &
SERVER_PID=$!

# Attendi qualche secondo per permettere al server di avviarsi
sleep 3

# Test unico su market-status (integra Supabase)
echo "Test endpoint /api/market-status"
curl -s "http://localhost:$PORT/api/market-status" | jq .

echo "Test completato"

# Termina il server per evitare log accavallati
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
~~~


