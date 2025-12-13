// routes/savePreviousClose.js
import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { exec } from "child_process";   // 👉 per eseguire comandi shell

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const url = `${baseUrl}/api/etf`;
const filePath = path.join(__dirname, "../data/previousClose.json");

router.get("/save-previous-close", async (req, res) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    const snapshot = [];
    const today = new Date().toISOString().split("T")[0];

    for (const key in data) {
      const price = data[key]?.price;
      if (price && !isNaN(parseFloat(price))) {
        snapshot.push({
          symbol: key,
          value: parseFloat(price),
          date: today
        });
      }
    }

    // 👉 aggiungi timestamp globale
    const payload = {
      timestamp: new Date().toISOString(),
      data: snapshot
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    console.log("✅ previousClose.json aggiornato:", filePath);

    // 👉 stampa contenuto per debug
    console.log("📄 Contenuto aggiornato:", JSON.stringify(payload, null, 2));

    // 👉 nuovo step: pull + push automatico su GitHub
    exec(`
      cd /opt/render/project/src &&
      git config --global user.email "render-bot@example.com" &&
      git config --global user.name "Render Bot" &&
      git pull origin main --rebase &&
      git add ${filePath} &&
      (git diff --cached --quiet || git commit -m "Update previousClose.json [ci skip]") &&
      git push https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/Marchino1978/etf-service.git HEAD:main
    `, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Errore push su GitHub:", error.message);
        console.error(stderr);
      } else {
        console.log("✅ previousClose.json pushato su GitHub");
        console.log(stdout);
      }
    });

    res.json({ status: "ok", updated: snapshot.length, timestamp: payload.timestamp });
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
