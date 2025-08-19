const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Test de Puppeteer...');
  
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    
    console.log('Navigateur lancé avec succès');
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    
    console.log('Page chargée avec succès');
    
    await browser.close();
    console.log('Test réussi !');
    process.exit(0);
    
  } catch (error) {
    console.error('Erreur lors du test:', error.message);
    process.exit(1);
  }
}

testPuppeteer(); 