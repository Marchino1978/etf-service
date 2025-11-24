import express from "express";
import { getPrice } from "./store.js";

const app = express();

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
