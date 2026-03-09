const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

function findChromiumPath() {
  const candidates = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function generateMonthlyAgentsPDF() {
  const args = process.argv.slice(2);
  const previewUrl = args[0];
  const pdfPath =
    args[1] || path.resolve(__dirname, "monthly_agents_report.pdf");
  const isLinux = process.platform === "linux";
  const chromiumPath = isLinux ? findChromiumPath() : undefined;

  console.log(`[monthly_agents_pdf] Platform: ${process.platform}`);
  console.log(`[monthly_agents_pdf] Preview URL: ${previewUrl}`);
  console.log(`[monthly_agents_pdf] Output path: ${pdfPath}`);
  console.log(`[monthly_agents_pdf] Chromium path: ${chromiumPath || "bundled (puppeteer)"}`);

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

  try {
    const browser = await puppeteer.launch(browserConfig);
    console.log("[monthly_agents_pdf] Browser launched");

    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 1,
      });

      console.log(`[monthly_agents_pdf] Navigating to: ${previewUrl}`);
      const response = await page.goto(previewUrl, {
        waitUntil: ["load", "networkidle0"],
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`Page load failed with status: ${response.status()}`);
      }
      console.log(`[monthly_agents_pdf] Page loaded: ${response.status()}`);

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

      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`[monthly_agents_pdf] PDF size: ${stats.size} bytes`);
        if (stats.size < 1000) {
          console.log("[monthly_agents_pdf] WARNING: PDF very small");
        }
      }

      await browser.close();
      process.exit(0);
    } catch (pageError) {
      console.error("[monthly_agents_pdf] Page error:", pageError.message);
      try {
        await page.screenshot({ path: "/tmp/puppeteer-agents-error.png" });
      } catch (_) {}
      await browser.close();
      throw pageError;
    }
  } catch (err) {
    console.error("[monthly_agents_pdf] Error:", err.message);
    console.error("[monthly_agents_pdf] Stack:", err.stack);

    if (err.message && err.message.includes("Could not find")) {
      console.error("[monthly_agents_pdf] CHROMIUM NOT FOUND. Install: sudo apt-get install -y chromium-browser");
    }

    process.exit(1);
  }
}

generateMonthlyAgentsPDF().catch((err) => {
  console.error("[monthly_agents_pdf] Unhandled:", err.message);
  process.exit(1);
});
