const path = require("path");
const puppeteer = require("puppeteer");

async function generatePDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0]; // L'URL de prévisualisation du devis
  const pdfPath = args[1] || path.resolve(__dirname, "devis.pdf"); // Par défaut devis.pdf

  console.log("URL de prévisualisation:", previewUrl); // Ajouter un log pour l'URL

  try {
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser", // chemin exact de Chromium
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
      ], // Ajout de paramètres pour Puppeteer
    });
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

      // Ajouter les cookies de session si disponibles
      const cookies = process.env.SESSION_COOKIES;
      if (cookies) {
        try {
          const cookieArray = JSON.parse(cookies);
          await page.setCookie(...cookieArray);
          console.log("Cookies de session ajoutés");
        } catch (e) {
          console.log("Impossible de parser les cookies:", e.message);
        }
      }

      const response = await page.goto(previewUrl, {
        waitUntil: ["load", "networkidle0"],
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`Page load failed with status: ${response.status()}`);
      }
      console.log("Page chargée avec succès");

      // Attendre que le contenu soit complètement chargé
      await page.waitForSelector("body", { timeout: 10000 });
      console.log("Contenu de la page détecté");

      // Attendre que tous les éléments soient chargés pour les PDFs multi-pages
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("Attente terminée - prêt pour la génération PDF");

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
        preferCSSPageSize: false, // IMPORTANT: Désactiver pour les PDFs multi-pages
        scale: 1,
        displayHeaderFooter: false,
        pageRanges: "", // Inclure toutes les pages
      });

      console.log("PDF généré avec succès");

      // Vérifier la taille du PDF généré
      const fs = require("fs");
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(
          `📊 Taille du PDF généré: ${stats.size} octets (${(
            stats.size /
            (1024 * 1024)
          ).toFixed(2)} MB)`
        );

        // Vérifier que le PDF n'est pas vide ou trop petit
        if (stats.size < 1000) {
          console.log(
            "⚠️ ATTENTION: PDF très petit, possible problème de génération"
          );
        } else {
          console.log("✅ PDF semble correctement généré");
        }
      } else {
        console.log("❌ Le PDF n'existe pas !");
      }

      await browser.close();
      console.log("Navigateur fermé");
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
