import readline from 'readline';
import { DateTime } from 'luxon';

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

// 🔎 Interfaccia per chiedere l’anno
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Inserisci un anno: ', (answer) => {
  const year = parseInt(answer);
  if (isNaN(year)) {
    console.log('⚠️ Devi inserire un numero valido.');
  } else {
    const easter = easterDate(year);
    const pasquetta = pasquettaDate(year);
    console.log(`Pasqua ${year}: ${easter.toISODate()}`);
    console.log(`Pasquetta ${year}: ${pasquetta.toISODate()}`);
  }
  rl.close();
});
