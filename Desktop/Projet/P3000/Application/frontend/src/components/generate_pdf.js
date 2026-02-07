const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

async function generatePDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0]; // L'URL de prévisualisation du devis
  const pdfPath = args[1] || path.resolve(__dirname, "devis.pdf"); // Par défaut devis.pdf

  // Détecter l'environnement : production (Linux) ou local (Windows/autre)
  // Priorité : google-chrome-stable (fonctionne avec www-data, pas de Snap)
  // Fallback : chromium-browser (Snap, fonctionne uniquement en root)
  const isProduction = process.platform === "linux";
  let chromiumPath = undefined;
  if (isProduction) {
    if (fs.existsSync("/usr/bin/google-chrome-stable")) {
      chromiumPath = "/usr/bin/google-chrome-stable";
    } else if (fs.existsSync("/usr/bin/chromium-browser")) {
      chromiumPath = "/usr/bin/chromium-browser";
    } else if (fs.existsSync("/usr/bin/chromium")) {
      chromiumPath = "/usr/bin/chromium";
    }
  }

  // Configuration des arguments selon l'environnement
  const launchArgs = [
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--font-render-hinting=none",
        "--disable-font-subpixel-positioning",
        "--disable-features=FontAccess",
        "--enable-font-antialiasing",
        "--force-device-scale-factor=1",
  ];

  // Ajouter --no-sandbox uniquement en production (nécessaire pour Gunicorn)
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

  try {
    const browser = await puppeteer.launch(browserConfig);

    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: 794,
        height: 1123, // A4 height in pixels
        deviceScaleFactor: 1,
      });

      // Injecter les polices système pour assurer la compatibilité
      await page.evaluateOnNewDocument(() => {
        const style = document.createElement('style');
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
          * {
            font-family: Arial, Helvetica, "Roboto", sans-serif !important;
          }
        `;
        document.head.appendChild(style);
      });

      // Ajouter les cookies de session si disponibles
      const cookies = process.env.SESSION_COOKIES;
      if (cookies) {
        try {
          const cookieArray = JSON.parse(cookies);
          await page.setCookie(...cookieArray);
        } catch (e) {
          // Ignorer les erreurs de parsing des cookies
        }
      }

      const response = await page.goto(previewUrl, {
        waitUntil: ["load", "networkidle0"],
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`Page load failed with status: ${response.status()}`);
      }

      // Attendre que le contenu soit complètement chargé
      await page.waitForSelector("body", { timeout: 10000 });

      // Attendre que tous les éléments soient chargés pour les PDFs multi-pages
      await new Promise((resolve) => setTimeout(resolve, 3000));

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
        preferCSSPageSize: false, // IMPORTANT: Désactiver pour les PDFs multi-pages
        scale: 1,
        displayHeaderFooter: false,
        pageRanges: "", // Inclure toutes les pages
      });

      await browser.close();
      process.exit(0); // Sortie réussie
    } catch (pageError) {
      console.error("Erreur lors du traitement de la page:", pageError);
      await page.screenshot({ path: "error-screenshot.png" });
      throw pageError;
    }
  } catch (err) {
    console.error("Erreur détaillée:", err);
    console.error("Stack trace:", err.stack);
    process.exit(1); // Sortie avec une erreur
  }
}

generatePDF().catch((err) => {
  console.error("Erreur non gérée:", err);
  process.exit(1);
});
