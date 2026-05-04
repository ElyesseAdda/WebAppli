const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

async function generatePDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0]; // L'URL de prévisualisation du devis
  const pdfPath = args[1] || path.resolve(__dirname, "devis.pdf"); // Par défaut devis.pdf

  // Détecter l'environnement : production (Linux) ou local (Windows/autre)
  const isProduction = process.platform === "linux" && fs.existsSync("/usr/bin/chromium-browser");
  const chromiumPath = isProduction ? "/usr/bin/chromium-browser" : undefined;

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
        waitUntil: ["load", "networkidle2"],
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`Page load failed with status: ${response.status()}`);
      }

      // Attendre que le contenu soit complètement chargé
      await page.waitForSelector("body", { timeout: 10000 });

      // Attendre que toutes les images soient complètement chargées (photos S3, logo, signature)
      // plutôt qu'un délai fixe de 3 secondes
      await page.waitForFunction(
        () => {
          const imgs = Array.from(document.querySelectorAll("img"));
          return imgs.every((img) => img.complete && img.naturalWidth > 0);
        },
        { timeout: 20000, polling: 200 }
      ).catch(() => {
        // Si certaines images ne se chargent pas (ex: URL expirée), on continue quand même
      });

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
