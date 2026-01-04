const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

async function generateAgentHoursPDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0]; // L'URL de prévisualisation du résumé
  const pdfPath = args[1] || path.resolve(__dirname, "agent_hours_summary.pdf");

  console.log("URL de prévisualisation:", previewUrl);

  // Détecter l'environnement : production (Linux) ou local (Windows/autre)
  const isProduction = process.platform === "linux" && fs.existsSync("/usr/bin/chromium-browser");
  const chromiumPath = isProduction ? "/usr/bin/chromium-browser" : undefined;

  // Configuration des arguments selon l'environnement
  const launchArgs = [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1920,1080",
  ];

  // Ajouter --no-sandbox uniquement en production (nécessaire pour Gunicorn)
  if (isProduction) {
    launchArgs.push("--no-sandbox", "--disable-setuid-sandbox");
  }

  const browserConfig = {
    headless: "new",
    args: launchArgs,
  };

  // Ajouter executablePath uniquement en production
  if (chromiumPath) {
    browserConfig.executablePath = chromiumPath;
    console.log("🌐 Mode production - Utilisation de Chromium système:", chromiumPath);
  } else {
    console.log("💻 Mode local - Utilisation du Chromium de Puppeteer");
  }

  try {
    const browser = await puppeteer.launch(browserConfig);
    console.log("Navigateur lancé");

    const page = await browser.newPage();
    console.log("Nouvelle page ouverte");

    try {
      await page.setViewport({
        width: 794,
        height: 1123, // A4 height in pixels
        deviceScaleFactor: 1,
      });
      console.log("Viewport configuré");

      console.log("Tentative de chargement de la page:", previewUrl);
      const response = await page.goto(previewUrl, {
        waitUntil: ["load", "networkidle0"],
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`Page load failed with status: ${response.status()}`);
      }
      console.log("Page chargée avec succès");

      // Attendre que le contenu soit complètement chargé
      await page.waitForSelector("body", { timeout: 5000 });
      console.log("Contenu de la page détecté");

      // Attendre un peu pour que les styles soient appliqués
      // Remplacer waitForTimeout par une promesse avec setTimeout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Début de la génération du PDF vers:", pdfPath);

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        landscape: false,
        margin: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
        preferCSSPageSize: true,
        scale: 1,
      });

      console.log("PDF généré avec succès");
      await browser.close();
      console.log("Navigateur fermé");
      process.exit(0);
    } catch (pageError) {
      console.error("Erreur lors du traitement de la page:", pageError);
      await page.screenshot({ path: "error-screenshot.png" });
      throw pageError;
    }
  } catch (err) {
    console.error("Erreur détaillée:", err);
    console.error("Stack trace:", err.stack);
    process.exit(1);
  }
}

generateAgentHoursPDF().catch((err) => {
  console.error("Erreur non gérée:", err);
  process.exit(1);
});
