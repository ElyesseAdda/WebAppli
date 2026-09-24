const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

/**
 * Génération PDF d'un diagramme de Gantt.
 *
 * Script distinct de `generate_pdf.js` car celui-ci force le portrait.
 * Ici la feuille est un A4 paysage explicite (297 mm × 210 mm, sans
 * `landscape: true`, qui inverserait ces dimensions). Le diagramme
 * occupe toujours toute la largeur : un planning court est étiré en
 * hauteur, un planning long est réduit sans rétrécir la feuille.
 */
async function generateGanttPDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0];
  const pdfPath =
    args[1] || path.join(require("os").tmpdir(), `gantt-${Date.now()}.pdf`);

  const isProduction =
    process.platform === "linux" && fs.existsSync("/usr/bin/chromium-browser");
  const chromiumPath = isProduction ? "/usr/bin/chromium-browser" : undefined;

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

  if (isProduction) {
    launchArgs.push("--no-sandbox", "--disable-setuid-sandbox");
  }

  const browserConfig = {
    headless: true,
    args: launchArgs,
  };

  if (chromiumPath) {
    browserConfig.executablePath = chromiumPath;
  }

  try {
    const browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();

    try {
      // A4 paysage à 96 dpi : 297 mm × 210 mm.
      const pageWidthPx = Math.round((297 / 25.4) * 96);
      const pageHeightPx = Math.round((210 / 25.4) * 96);
      await page.setViewport({
        width: pageWidthPx,
        height: pageHeightPx,
        deviceScaleFactor: 1,
      });

      await page.evaluateOnNewDocument(() => {
        const style = document.createElement("style");
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
          * {
            font-family: Arial, Helvetica, "Roboto", sans-serif !important;
          }
        `;
        document.head.appendChild(style);
      });

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

      await page.waitForSelector("body", { timeout: 10000 });

      await page
        .waitForFunction(
          () => {
            const imgs = Array.from(document.querySelectorAll("img"));
            return imgs.every((img) => img.complete && img.naturalWidth > 0);
          },
          { timeout: 20000, polling: 200 }
        )
        .catch(() => {
          // Une image manquante ne doit pas bloquer la génération
        });

      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

      // Largeur toujours égale à la feuille. Si le planning est plus court
      // que la page, les lignes s'étirent pour la remplir. S'il est plus
      // haut, on l'élargit puis on le réduit : une fois imprimé, il
      // retrouve toute la largeur et tient sur une seule page.
      const pdfScale = await page.evaluate(
        ({ pageWidthPx, pageHeightPx }) => {
          const pageEl = document.querySelector(".page");
          if (!pageEl) return 1;

          const targetHeight = pageHeightPx - 8;
          const contentHeight = Math.ceil(
            Math.max(pageEl.scrollHeight, pageEl.getBoundingClientRect().height)
          );

          if (contentHeight > targetHeight) {
            const fit = targetHeight / contentHeight;
            pageEl.style.width = `${pageWidthPx / fit}px`;
            if (fit < 0.1) {
              document.documentElement.style.zoom = String(fit / 0.1);
              return 0.1;
            }
            return fit;
          }

          const rows = Array.from(document.querySelectorAll(".rangee"));
          if (!rows.length || contentHeight >= targetHeight - 1) return 1;

          const extra = (targetHeight - contentHeight) / rows.length;
          rows.forEach((row) => {
            const next = row.getBoundingClientRect().height + extra;
            row.style.minHeight = `${next}px`;
            const zone = row.querySelector(".zone-barres");
            if (zone) zone.style.minHeight = `${next}px`;
          });
          return 1;
        },
        { pageWidthPx, pageHeightPx }
      );

      await page.emulateMediaType("print");

      await page.pdf({
        path: pdfPath,
        width: "297mm",
        height: "210mm",
        printBackground: true,
        landscape: false,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
        preferCSSPageSize: false,
        scale: pdfScale,
        displayHeaderFooter: false,
      });

      await browser.close();
      process.exit(0);
    } catch (pageError) {
      console.error("Erreur lors du traitement de la page:", pageError);
      throw pageError;
    }
  } catch (err) {
    console.error("Erreur détaillée:", err);
    console.error("Stack trace:", err.stack);
    process.exit(1);
  }
}

generateGanttPDF().catch((err) => {
  console.error("Erreur non gérée:", err);
  process.exit(1);
});
