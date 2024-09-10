const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const previewUrl = args[0];  // L'URL de prévisualisation du devis

  console.log("URL de prévisualisation:", previewUrl);  // Ajouter un log pour l'URL

  try {
    const browser = await puppeteer.launch({
      headless: true, // Si vous voulez voir le navigateur, mettez à false
      args: ['--no-sandbox', '--disable-setuid-sandbox']  // Ajout de paramètres pour Puppeteer
    });
    console.log("Navigateur lancé");

    const page = await browser.newPage();
    console.log("Nouvelle page ouverte");

    // Augmenter le délai d'attente à 60 secondes (60000 ms)
    await page.goto(previewUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    console.log("Page chargée");

    // Chemin pour stocker le PDF
    const pdfPath = path.resolve(__dirname, 'devis.pdf');
    console.log("Génération du PDF...");

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
    });

    console.log("PDF généré et enregistré à:", pdfPath);

    await browser.close();
    console.log("Navigateur fermé");
    process.exit(0);  // Sortie réussie
  } catch (err) {
    console.error('Erreur lors de la génération du PDF:', err);  // Affiche l'erreur complète
    process.exit(1);  // Sortie avec une erreur
  }
})();
