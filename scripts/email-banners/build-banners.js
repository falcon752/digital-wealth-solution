#!/usr/bin/env node
/**
 * Builds the email hero banners in frontend/public/email/ (served at /email/<name>.jpg, which
 * the site gate lets through, so mail apps can load them).
 *
 * Each banner follows DirectStay's banner-art rules (banner-art.svg): a pale tint of the accent,
 * thin isometric line shapes in the accent, small solid triangles and one faint circle, laid
 * around the content and cropped by the edges. DWP's own photos sit in a rounded card on the right.
 *
 * Run from the repo root (needs Google Chrome and puppeteer-core on NODE_PATH):
 *   NODE_PATH=/path/to/node_modules node scripts/email-banners/build-banners.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.join(ROOT, 'frontend/public');
const OUT = path.join(PUBLIC, 'email');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ACCENT = '#0033AD'; // DWP blue, the platform accent (buttons, links)
const TINT = '#E8EEFB'; // the accent at ~9% on white, like DirectStay's #e8efff for #4569FD
const HEADING = '#17205C'; // DWP navy, the site's heading colour

const PHOTOS = {
  handshake: 'Digital-Wealth-Partners-Crypto-Financial-Advisor-25.webp',
  advisor: 'Digital-Wealth-Partners-Crypto-Financial-Advisor-23.webp',
  meeting: 'Four professionals in suits sit around a table, talking and looking at laptops in a bright office with plants and supplies nearby. - Digital Wealth Partners .webp',
  tower: 'career-hero.webp',
  glass: 'crypto-investment-wealth-digital-assets-41.webp',
  offices: 'crypto-investment-wealth-digital-assets-24.webp',
  skyline: 'crypto-investment-wealth-digital-assets-3.webp',
  documents: 'crypto-investment-wealth-digital-assets-19.webp',
  presentation: 'crypto-investment-wealth-digital-assets-17.webp',
  dallas: 'dallas-downtown.png',
};

/** name → photo and the short headline printed on the banner (the email's own title says more). */
const BANNERS = {
  welcome: { photo: 'handshake', headline: 'Welcome to Digital Wealth Partners' },
  verified: { photo: 'advisor', headline: "You're verified" },
  kyc: { photo: 'documents', headline: 'Identity verification' },
  security: { photo: 'tower', headline: 'Secure access' },
  payment: { photo: 'glass', headline: 'Payments' },
  deposit: { photo: 'offices', headline: 'Deposits' },
  withdrawal: { photo: 'skyline', headline: 'Withdrawals' },
  consultation: { photo: 'meeting', headline: 'Your consultation' },
  lending: { photo: 'documents', headline: 'Lending and yield' },
  llc: { photo: 'dallas', headline: 'LLC formation' },
  notice: { photo: 'skyline', headline: 'Account notice' },
  admin: { photo: 'presentation', headline: 'Team alert' },
};

// DirectStay's shapes (banner-art.svg), each with the point to place it at, its scale and the
// original top-left corner so it can be moved there.
const art = fs.readFileSync(path.join(__dirname, 'banner-art.svg'), 'utf8');
const shape = (id) => {
  const match = art.match(new RegExp(`<(path|circle) id="${id}"[^>]*/>`));
  if (!match) throw new Error(`banner-art.svg has no shape "${id}"`);
  return match[0].replace(/ id="[^"]+"/, ' vector-effect="non-scaling-stroke"');
};
const PLACEMENTS = [
  { id: 'dart-left', from: [0, -16], to: [0, -6], scale: 1.5 },
  { id: 'box', from: [30, 46], to: [318, 18], scale: 1.15 },
  { id: 'dart-top', from: [396, -18], to: [392, 236], scale: 1.1 },
  { id: 'ring', from: [317, 58], to: [-10, 196], scale: 1.9 },
  { id: 'cubes', from: [702, 40], to: [352, 176], scale: 1.45 },
  { id: 'dart-right', from: [461, 63], to: [846, 262], scale: 1.05 },
];
const decoration = PLACEMENTS.map(({ id, from, to, scale }) =>
  `<g transform="translate(${to[0]} ${to[1]}) scale(${scale}) translate(${-from[0]} ${-from[1]})">${shape(id)}</g>`
).join('');

const fileUrl = (p) => 'file://' + p.split('/').map(encodeURIComponent).join('/');
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function bannerHtml({ photo, headline }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@600;700&display=swap">
<style>
  html, body { margin: 0; }
  .banner { position: relative; width: 890px; height: 300px; overflow: hidden; background: ${TINT}; font-family: 'Source Sans 3', Arial, Helvetica, sans-serif; }
  .art { position: absolute; inset: 0; }
  .logo { position: absolute; left: 44px; top: 36px; height: 56px; }
  .headline { position: absolute; left: 44px; top: 128px; width: 330px; margin: 0; font-size: 36px; line-height: 1.08; font-weight: 700; letter-spacing: -0.6px; color: ${HEADING}; }
  .rule { position: absolute; left: 44px; bottom: 44px; width: 44px; height: 4px; border-radius: 2px; background: ${ACCENT}; }
  .photo { position: absolute; right: 40px; top: 30px; width: 410px; height: 240px; border-radius: 18px; object-fit: cover; box-shadow: 0 18px 40px rgba(0, 51, 173, 0.18); }
</style></head><body>
<div class="banner">
  <svg class="art" width="890" height="300" viewBox="0 0 890 300" fill="none" xmlns="http://www.w3.org/2000/svg">${decoration}</svg>
  <img class="logo" src="${fileUrl(path.join(PUBLIC, 'dwp-logo.png'))}" alt="">
  <h1 class="headline">${escapeHtml(headline)}</h1>
  <div class="rule"></div>
  <img class="photo" src="${fileUrl(path.join(PUBLIC, PHOTOS[photo]))}" alt="">
</div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  // Twice the 890px email width, so the banner is sharp on high-density screens.
  await page.setViewport({ width: 890, height: 300, deviceScaleFactor: 2 });
  const tmp = path.join(require('os').tmpdir(), `dwp-banner-${process.pid}.html`);
  for (const [name, banner] of Object.entries(BANNERS)) {
    fs.writeFileSync(tmp, bannerHtml(banner));
    await page.goto(fileUrl(tmp), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `${name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 890, height: 300 } });
    console.log(`${name}.jpg  ${Math.round(fs.statSync(file).size / 1024)} KB`);
  }
  fs.unlinkSync(tmp);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
