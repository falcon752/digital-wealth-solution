const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to login...');
  await page.goto('https://digitalwealthpartnersllc.net/login', { waitUntil: 'networkidle0' });
  
  await page.type('input[type="email"]', 'atikuquadrisegun@gmail.com');
  await page.type('input[type="password"]', 'P@ss12!!');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
  console.log('Navigating to swap...');
  await page.goto('https://digitalwealthpartnersllc.net/dashboard/swap', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => document.body.innerText);
  console.log('Page content:', content.substring(0, 1000));
  
  await browser.close();
})();
