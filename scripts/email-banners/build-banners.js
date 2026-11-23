#!/usr/bin/env node
/**
 * Builds the email hero banners in frontend/public/email/ (served at /email/<name>.jpg, which
 * the site gate lets through, so mail apps can load them).
 *
 * Each banner follows DirectStay's banner-art rules (banner-art.svg): a tint background, thin
 * accent line icons (crypto assets here: Bitcoin, Ethereum, XRP, a chart, chained blocks, a
 * wallet), small solid triangles and one faint circle, cropped by the edges. DWP's own photos sit
 * in a rounded card on the right. Every banner comes in light (<name>.jpg) and dark (<name>-dark.jpg).
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

// Light: a pale tint of DWP blue. Dark: DirectStay's dark banner navy (#151927), with a lighter
// shade of DWP blue so the thin lines stay visible, and the white-text logo.
const THEMES = {
  light: { suffix: '', accent: '#0033AD', background: '#E8EEFB', heading: '#17205C', rule: '#0033AD', logo: 'dwp-logo.png', shadow: 'rgba(0, 51, 173, 0.18)' },
  dark: { suffix: '-dark', accent: '#6F92F2', background: '#141A2E', heading: '#FFFFFF', rule: '#6F92F2', logo: 'dwp-logo-dark.png', shadow: 'rgba(0, 0, 0, 0.45)' },
};

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

// The icons and DirectStay's triangles and circle (banner-art.svg), each moved to its spot.
const art = fs.readFileSync(path.join(__dirname, 'banner-art.svg'), 'utf8');
function shape(id) {
  const group = art.match(new RegExp(`<g id="${id}"([^>]*)>([\\s\\S]*?)</g>`));
  if (group) {
    const attrs = group[1].replace(/\s*transform="[^"]*"/, '');
    return `<g${attrs}>${group[2]}</g>`;
  }
  const single = art.match(new RegExp(`<(path|circle) id="${id}"[^>]*/>`));
  if (!single) throw new Error(`banner-art.svg has no shape "${id}"`);
  return single[0].replace(/ id="[^"]+"/, '').replace(/\s*transform="[^"]*"/, '');
}
// [id, x, y, scale, origin of the shape in banner-art.svg (the icons are drawn at 0,0)]
const PLACEMENTS = [
  ['ring', -40, 190, 2.4, [614, 14]],
  ['bitcoin', 300, 14, 0.95],
  ['blocks', 172, 40, 0.72],
  ['candles', 196, 214, 0.62],
  ['ethereum', 372, 182, 0.78],
  ['xrp', 120, 238, 0.46],
  ['wallet', 846, 236, 0.62],
  ['dart-a', 0, -8, 1.5, [0, -16]],
  ['dart-b', 286, 252, 1.0, [461, 63]],
];
const thin = (markup) => markup.replace(/<(path|circle|rect)\b/g, '<$1 vector-effect="non-scaling-stroke"');
const decoration = PLACEMENTS.map(([id, x, y, scale, origin = [0, 0]]) =>
  `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-origin[0]} ${-origin[1]})">${thin(shape(id))}</g>`
).join('');

const fileUrl = (p) => 'file://' + p.split('/').map(encodeURIComponent).join('/');
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function bannerHtml({ photo, headline }, theme) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@600;700&display=swap">
<style>
  html, body { margin: 0; }
  .banner { position: relative; width: 890px; height: 300px; overflow: hidden; background: ${theme.background}; font-family: 'Source Sans 3', Arial, Helvetica, sans-serif; }
  .art { position: absolute; inset: 0; }
  .logo { position: absolute; left: 44px; top: 36px; height: 56px; }
  .headline { position: absolute; left: 44px; top: 128px; width: 330px; margin: 0; font-size: 36px; line-height: 1.08; font-weight: 700; letter-spacing: -0.6px; color: ${theme.heading}; }
  .rule { position: absolute; left: 44px; bottom: 44px; width: 44px; height: 4px; border-radius: 2px; background: ${theme.rule}; }
  .photo { position: absolute; right: 40px; top: 30px; width: 410px; height: 240px; border-radius: 18px; object-fit: cover; box-shadow: 0 18px 40px ${theme.shadow}; }
</style></head><body>
<div class="banner">
  <svg class="art" width="890" height="300" viewBox="0 0 890 300" fill="none" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${decoration.replace(/#0033AD/g, theme.accent)}</svg>
  <img class="logo" src="${fileUrl(path.join(PUBLIC, theme.logo))}" alt="">
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
  for (const [name, banner] of Object.entries(BANNERS)) for (const theme of Object.values(THEMES)) {
    fs.writeFileSync(tmp, bannerHtml(banner, theme));
    await page.goto(fileUrl(tmp), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `${name}${theme.suffix}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 890, height: 300 } });
    console.log(`${path.basename(file)}  ${Math.round(fs.statSync(file).size / 1024)} KB`);
  }
  fs.unlinkSync(tmp);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
