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
