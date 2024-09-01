const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Charger l'HTML depuis un fichier local
        await page.goto(`file:///C:/Users/Boume/Desktop/Projet-React/P3000/WebAppli/Application/frontend/templates/devis.html`, {waitUntil: 'networkidle2'});

        // Générer le PDF
        await page.pdf({
            path: 'devis.pdf',
            format: 'A4',
            printBackground: true,
            scale: 1,
            preferCSSPageSize: true
         });

        // Attendre quelques secondes avant de fermer le navigateur
        await page.waitForTimeout(5000);

        await browser.close();
    } catch (error) {
        console.error("Error generating PDF:", error);
    }
})();
