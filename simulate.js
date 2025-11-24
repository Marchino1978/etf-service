import fetch from "node-fetch";

const baseUrl = "https://etf-service.onrender.com/api/etf";

async function simulateESP32() {

  const allRes = await fetch(baseUrl);
  const allData = await allRes.json();
  console.log("Tutti gli ETF:", allData);
}

simulateESP32();
