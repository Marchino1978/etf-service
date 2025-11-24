import express from "express";
import { getPrice, getAllPrices } from "./store.js";
import "./updater.js"; // <-- avvia subito l’updater

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/etf", (req, res) => {
  res.json(getAllPrices());
});

app.get("/api/etf/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const price = getPrice(symbol);
  if (price) {
    res.json(price);
  } else {
    res.status(404).json({ error: "ETF non trovato" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server avviato su http://localhost:3000");
});
