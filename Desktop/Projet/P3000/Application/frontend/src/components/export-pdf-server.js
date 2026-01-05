const puppeteer = require("puppeteer");
const fs = require("fs");
const express = require("express");
const app = express();

app.get("/export-pdf", async (req, res) => {
  const { agent, week, year } = req.query;
  const url = `http://localhost:3000/planning/print?agent=${agent}&week=${week}&year=${year}`;

  // Détecter l'environnement : production (Linux) ou local (Windows/autre)
  const isProduction = process.platform === "linux" && fs.existsSync("/usr/bin/chromium-browser");
  const chromiumPath = isProduction ? "/usr/bin/chromium-browser" : undefined;

  // Configuration des arguments selon l'environnement
  const launchArgs = [];
  if (isProduction) {
    launchArgs.push("--no-sandbox", "--disable-setuid-sandbox");
  }

  const browserConfig = {
    headless: true,
    args: launchArgs,
  };

  // Ajouter executablePath uniquement en production
  if (chromiumPath) {
    browserConfig.executablePath = chromiumPath;
  }

  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=\"planning_agent_${agent}_S${week}_${year}.pdf\"`,
  });
  res.send(pdfBuffer);
});

app.listen(4000, () => {
  console.log("Export PDF server running on port 4000");
});
