const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const puppeteer = require("puppeteer");

function isSnapBinary(binPath) {
  try {
    const output = execSync(`${binPath} --version 2>&1`, { encoding: "utf-8", timeout: 5000 });
    return output.toLowerCase().includes("snap");
  } catch {
    return false;
  }
}

function findChromiumPath() {
  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/opt/google/chrome/google-chrome",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      if (isSnapBinary(p)) {
        console.log(`[generate_pdf] ${p} is snap — skipped (incompatible with www-data)`);
        continue;
      }
      return p;
    }
  }
  return undefined;
}

async function generatePDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0];
  const pdfPath = args[1] || path.resolve(__dirname, "devis.pdf");
  const isLinux = process.platform === "linux";
  const chromiumPath = isLinux ? findChromiumPath() : undefined;

  console.log(`[generate_pdf] Platform: ${process.platform}`);
  console.log(`[generate_pdf] Preview URL: ${previewUrl}`);
  console.log(`[generate_pdf] Output path: ${pdfPath}`);
  console.log(`[generate_pdf] Chromium path: ${chromiumPath || "bundled (puppeteer)"}`);

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

  if (isLinux) {
    launchArgs.push("--no-sandbox", "--disable-setuid-sandbox");
  }

  const browserConfig = {
    headless: true,
    args: launchArgs,
  };

  if (chromiumPath) {
    browserConfig.executablePath = chromiumPath;
  }

  console.log(`[generate_pdf] Launch args: ${launchArgs.join(" ")}`);
  console.log(`[generate_pdf] executablePath: ${browserConfig.executablePath || "auto-detect (puppeteer bundled)"}`);

  try {
    const browser = await puppeteer.launch(browserConfig);
    console.log(`[generate_pdf] Browser launched successfully`);

    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 1,
      });

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

      const cookies = process.env.SESSION_COOKIES;
      if (cookies) {
        try {
          const cookieArray = JSON.parse(cookies);
          await page.setCookie(...cookieArray);
        } catch (e) {
          // Ignorer les erreurs de parsing des cookies
        }
      }

      console.log(`[generate_pdf] Navigating to: ${previewUrl}`);
      const response = await page.goto(previewUrl, {
        waitUntil: ["load", "networkidle0"],
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`Page load failed with status: ${response.status()}`);
      }
      console.log(`[generate_pdf] Page loaded with status: ${response.status()}`);

      await page.waitForSelector("body", { timeout: 10000 });
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
        preferCSSPageSize: false,
        scale: 1,
        displayHeaderFooter: false,
        pageRanges: "",
      });

      console.log(`[generate_pdf] PDF generated successfully: ${pdfPath}`);
      await browser.close();
      process.exit(0);
    } catch (pageError) {
      console.error("[generate_pdf] Erreur page:", pageError.message);
      try {
        await page.screenshot({ path: "/tmp/puppeteer-error-screenshot.png" });
      } catch (_) {}
      await browser.close();
      throw pageError;
    }
  } catch (err) {
    console.error("[generate_pdf] Erreur:", err.message);
    console.error("[generate_pdf] Stack:", err.stack);

    if (err.message && (err.message.includes("Could not find") || err.message.includes("Failed to launch"))) {
      console.error("=== DIAGNOSTIC ===");
      console.error("Chromium non utilisable. Solutions :");
      console.error("1. Installer Google Chrome: wget -q -O /tmp/gc.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo apt install -y /tmp/gc.deb");
      console.error("2. Ou configurer le cache Puppeteer: sudo mkdir -p /opt/puppeteer-cache && sudo chown www-data:www-data /opt/puppeteer-cache && PUPPETEER_CACHE_DIR=/opt/puppeteer-cache npx puppeteer browsers install chromium");
      console.error("Cache Puppeteer actuel: " + (process.env.PUPPETEER_CACHE_DIR || "~/.cache/puppeteer"));
      console.error("==================");
    }

    process.exit(1);
  }
}

generatePDF().catch((err) => {
  console.error("[generate_pdf] Erreur non geree:", err.message);
  process.exit(1);
});
