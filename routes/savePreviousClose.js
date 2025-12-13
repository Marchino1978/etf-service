// routes/savePreviousClose.js
import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { exec } from "child_process";

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

    const today = new Date().toISOString().split("T")[0];
    const snapshot = {};

    // 👉 costruzione mappa ETF
    for (const key in data) {
      const price = data[key]?.price;
      if (price && !isNaN(parseFloat(price))) {
        snapshot[key] = {
          price: parseFloat(price),
          date: today
        };
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log("✅ previousClose.json aggiornato:", filePath);
    console.log("📄 Contenuto aggiornato:", JSON.stringify(snapshot, null, 2));

    // 👉 commit prima del pull per evitare "unstaged changes"
    exec(`
      cd /opt/render/project/src &&
      git config --global user.email "render-bot@example.com" &&
      git config --global user.name "Render Bot" &&
      git add ${filePath} &&
      (git diff --cached --quiet || git commit -m "Update previousClose.json [ci skip]") &&
      git pull origin main --rebase &&
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

    res.json({ status: "ok", updated: Object.keys(snapshot).length, date: today });
  } catch (err) {
    console.error("❌ Errore nel salvataggio:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
