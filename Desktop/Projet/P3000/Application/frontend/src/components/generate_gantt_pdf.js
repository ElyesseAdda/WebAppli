const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

/**
 * Génération PDF d'un diagramme de Gantt.
 *
 * Script distinct de `generate_pdf.js` car celui-ci force `landscape: false`,
 * ce qui écrase le `@page { size: A4 landscape }` du template. Un Gantt n'est
 * lisible qu'en paysage : le viewport et le format sont donc inversés ici.
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
      // Dimensions A4 paysage
      await page.setViewport({
        width: 1123,
        height: 794,
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

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        landscape: true,
        margin: {
          top: "15px",
          right: "15px",
          bottom: "15px",
          left: "15px",
        },
        preferCSSPageSize: false,
        scale: 1,
        displayHeaderFooter: false,
        pageRanges: "",
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
