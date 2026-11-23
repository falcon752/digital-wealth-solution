/**
 * DWP's email layout, cloned from DirectStay's (directstay-backend/src/modules/email-templates:
 * email-template-renderer.ts, templates/email-footer.ts, email-text.ts) with DWP's branding:
 * DWP blue (#0033AD) as the accent, DWP gold (#AD7F4E) in the footer, DWP's own banners.
 *
 * Layout: an 890px white frame, a full-width hero banner, then eyebrow, title, paragraphs,
 * a details table, a callout, a quote, a button and supporting text, then the dark footer, which
 * sits at the bottom of the window when the message is short.
 *
 * Dark mode: mail apps that follow the system theme (Apple Mail, iOS, Outlook) get dark colours
 * and the dark banner (<name>-dark.jpg) through the dwp-* classes; the rest show the light design.
 */

const ACCENT = '#0033AD';
const FOOTER_ACCENT = '#AD7F4E';
// The footer keeps DirectStay's charcoal in light and dark mode. Set as a background image too,
// because Gmail's dark mode inverts background colours but leaves images alone.
const FOOTER_BG = '#2c3236';
const FOOTER_BG_STYLE = `background-color:${FOOTER_BG};background-image:linear-gradient(${FOOTER_BG},${FOOTER_BG});`;
// Gmail on iPhone also inverts text colours in dark mode; these two wrappers turn the white
// footer text back to white there (the selector only matches inside Gmail, see buildHeadStyles).
const keepWhite = (html) => `<div class="dwp-gm-screen"><div class="dwp-gm-diff">${html}</div></div>`;
const SUPPORT_EMAIL = 'support@digitalwealthpartnersllc.net';

// Banners and the footer logo are static files on the public site (frontend/public), so every
// environment points at the live site, where mail apps can load them.
const ASSET_BASE = () => (process.env.EMAIL_ASSET_URL || 'https://digitalwealthpartnersllc.net').replace(/\/$/, '');

/** The banners in frontend/public/email (built by scripts/email-banners/build-banners.js). */
const HERO_NAMES = ['welcome', 'verified', 'kyc', 'security', 'payment', 'deposit', 'withdrawal', 'consultation', 'lending', 'llc', 'notice', 'admin'];
const hero = (name, dark = false) => {
  if (!HERO_NAMES.includes(name)) throw new Error(`Unknown email hero "${name}"`);
  return `${ASSET_BASE()}/email/${name}${dark ? '-dark' : ''}.jpg`;
};

function escapeEmailHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Paragraphs, list items and details take plain text (escaped here). Pass { html: '...' } for
// the few places that need markup (a bold word, a link), already escaped by the caller.
const text = (value) => (value && typeof value === 'object' && 'html' in value ? value.html : escapeEmailHtml(value));

const paragraph = (value) =>
  `<p class="dwp-text" style="margin:0 0 18px;font-size:15px;line-height:1.38;color:#171b22;">${text(value)}</p>`;

const renderParagraphs = (items) => (items || []).filter(Boolean).map(paragraph).join('');

/**
 * A real data table: each label is a row header, so a screen reader reads "Amount, 1,035 XRP".
 * The label grey is #5f6878 (5.6:1 on white).
 */
function renderDetails(rows, variant = 'plain') {
  const content = rows
    .filter((row) => row && row.value !== undefined && row.value !== null && row.value !== '')
    .map(({ label, value }) =>
      `<tr><th class="dwp-label" scope="row" style="padding:6px 12px 6px 0;color:#5f6878;width:38%;font-size:13px;font-weight:400;text-align:left;vertical-align:top;">${escapeEmailHtml(label)}</th>` +
      `<td class="dwp-value" style="padding:6px 0;text-align:right;color:#20242b;font-size:13px;font-weight:500;word-break:break-word;">${text(value)}</td></tr>`)
    .join('');
  const table = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${content}</table>`;
  if (variant === 'card') {
    return `<table class="dwp-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border:1px solid #e5e7eb;border-radius:18px;border-collapse:separate;"><tr><td style="padding:20px 30px;">${table}</td></tr></table>`;
  }
  return `<div style="margin:8px 0 24px;">${table}</div>`;
}

/** The tinted box. `tone: 'danger'` makes it red (a reason something was declined). */
function renderCallout(callout) {
  const danger = callout.tone === 'danger';
  const background = danger ? '#fef2f2' : '#f3f7ff';
  const title = callout.title
    ? `<h2 class="${danger ? 'dwp-danger-title' : 'dwp-heading'}" style="margin:0 0 12px;font-size:18px;line-height:1.25;font-weight:600;color:${danger ? '#991b1b' : '#20242b'};">${escapeEmailHtml(callout.title)}</h2>`
    : '';
  const body = callout.text
    ? `<p class="dwp-small" style="margin:0;font-size:13px;line-height:1.45;color:#30353d;white-space:pre-line;">${text(callout.text)}</p>`
    : '';
  const items = callout.items && callout.items.length
    ? `<ul class="dwp-small" style="margin:0;padding-left:19px;font-size:13px;line-height:1.55;color:#30353d;">${callout.items.map((item) => `<li style="margin:0 0 4px;">${text(item)}</li>`).join('')}</ul>`
    : '';
  const steps = callout.steps && callout.steps.length
    ? `<ol class="dwp-small" style="margin:0;padding-left:19px;font-size:13px;line-height:1.55;color:#30353d;">${callout.steps.map((item) => `<li style="margin:0 0 6px;">${text(item)}</li>`).join('')}</ol>`
    : '';
  const note = callout.note
    ? `<p class="dwp-muted" style="margin:12px 0 0;font-size:12px;line-height:1.45;color:#5f6878;">${text(callout.note)}</p>`
    : '';
  return `<div class="${danger ? 'dwp-callout-danger' : 'dwp-callout'}" style="margin:8px 0 24px;padding:18px 20px;border-radius:10px;background-color:${background};">${title}${body}${items}${steps}${note}</div>`;
}

function renderAction(action) {
  return `<a class="dwp-btn" href="${escapeEmailHtml(action.url)}" style="display:block;margin:8px 0 24px;padding:14px 20px;border-radius:8px;background-color:${ACCENT};color:#ffffff;font-size:14px;line-height:1.2;font-weight:700;text-align:center;text-decoration:none;">${escapeEmailHtml(action.label)}</a>`;
}

function renderActionAt(model, afterSupporting) {
  if (!model.action || Boolean(model.actionAfterSupporting) !== afterSupporting) return '';
  return renderAction(model.action);
}

function renderContent(model) {
  const eyebrow = model.eyebrow
    ? `<p class="dwp-eyebrow" style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${ACCENT};">${escapeEmailHtml(model.eyebrow)}</p>`
    : '';
  const quote = model.quote
    ? `<div class="dwp-callout dwp-small" style="margin:8px 0 24px;padding:16px 18px;border-radius:8px;background-color:#f3f7ff;font-size:13px;line-height:1.45;color:#30353d;white-space:pre-line;">${text(model.quote)}</div>`
    : '';
  const code = model.code
    ? `<div class="dwp-callout dwp-code" style="margin:8px 0 24px;padding:18px;border-radius:10px;background-color:#f3f7ff;text-align:center;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#20242b;">${escapeEmailHtml(model.code)}</div>`
    : '';
  const callouts = (model.callouts || (model.callout ? [model.callout] : [])).map(renderCallout).join('');
  return (
    eyebrow +
    `<h1 class="dwp-title" style="margin:0 0 24px;font-size:30px;line-height:1.12;font-weight:700;letter-spacing:-.7px;color:#292d33;">${escapeEmailHtml(model.title)}</h1>` +
    renderParagraphs(model.paragraphs) +
    code +
    (model.details && model.details.length ? renderDetails(model.details, model.detailsVariant) : '') +
    callouts +
    quote +
    renderActionAt(model, false) +
    renderParagraphs(model.supporting) +
    renderActionAt(model, true)
  );
}

// Dark colours, for apps that follow the system theme (Apple Mail, iOS Mail) and, through the
// [data-ogsc]/[data-ogsb] attributes, Outlook. The footer is already dark.
const DARK = {
  page: '#0f1115', title: '#f3f4f6', text: '#d7dbe1', label: '#9aa3b2', value: '#eef0f3',
  card: '#2c313a', callout: '#1a2235', danger: '#3a1416', dangerTitle: '#fca5a5', accent: '#8FAEFF',
};
const darkRules = (scope) =>
  `${scope('body')},${scope('.dwp-page')},${scope('.dwp-email-frame')}{background-color:${DARK.page}!important;}` +
  `${scope('.dwp-title')},${scope('.dwp-heading')}{color:${DARK.title}!important;}` +
  `${scope('.dwp-text')},${scope('.dwp-small')},${scope('.dwp-code')}{color:${DARK.text}!important;}` +
  `${scope('.dwp-label')},${scope('.dwp-muted')}{color:${DARK.label}!important;}` +
  `${scope('.dwp-value')}{color:${DARK.value}!important;}` +
  `${scope('.dwp-card')}{border-color:${DARK.card}!important;}` +
  `${scope('.dwp-callout')}{background-color:${DARK.callout}!important;}` +
  `${scope('.dwp-callout-danger')}{background-color:${DARK.danger}!important;}` +
  `${scope('.dwp-danger-title')}{color:${DARK.dangerTitle}!important;}` +
  `${scope('.dwp-eyebrow')},${scope('.dwp-content a:not(.dwp-btn)')}{color:${DARK.accent}!important;}`;
// The footer never changes colour: stated outright for each dark mode, so no app recolours it.
const FOOTER_LOCK =
  `.dwp-email-footer,.dwp-footer-cell{background-color:${FOOTER_BG}!important;}` +
  '.dwp-email-footer td,.dwp-footer-address,.dwp-footer-address strong,.dwp-footer-address span{color:#ffffff!important;}' +
  `.dwp-footer-link{color:${FOOTER_ACCENT}!important;}`;
const scoped = (css, prefix) => css.replace(/(^|\})([^{}]+)\{/g, (m, close, selectors) =>
  `${close}${selectors.split(',').map((sel) => `${prefix} ${sel.trim()}`).join(',')}{`);
const DARK_STYLES =
  // Gmail (iPhone) dark mode: undo its text inversion inside the footer.
  'u + .body .dwp-gm-screen{background:#000;mix-blend-mode:screen;}u + .body .dwp-gm-diff{background:#000;mix-blend-mode:difference;}' +
  scoped(FOOTER_LOCK, '[data-ogsc]') + scoped(FOOTER_LOCK, '[data-ogsb]') +
  `@media (prefers-color-scheme:dark){${darkRules((s) => s)}${FOOTER_LOCK}` +
  '.dwp-hero-light{display:none!important;}.dwp-hero-dark{display:block!important;max-height:none!important;overflow:visible!important;}}' +
  darkRules((s) => `[data-ogsc] ${s}`).replace(/background-color[^;]*;/g, '') +
  darkRules((s) => `[data-ogsb] ${s}`).replace(/(?<![-\w])color:[^;]*;/g, '');

function buildHeadStyles() {
  return (
    '<style>:root{color-scheme:light dark;supported-color-schemes:light dark;}' +
    '@media screen and (max-width:760px){' +
    '.dwp-email-frame,.dwp-email-footer{width:100%!important;}' +
    '.dwp-footer-column{display:block!important;width:100%!important;box-sizing:border-box!important;text-align:left!important;}' +
    '.dwp-footer-top-title{padding:42px 32px 0!important;}' +
    '.dwp-footer-top-contact{padding:22px 32px 0!important;white-space:normal!important;}' +
    '.dwp-footer-bottom{padding:42px 32px 44px!important;}' +
    '}.dwp-footer-address,.dwp-footer-address a{color:#ffffff!important;text-decoration:none!important;}' +
    'a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}' +
    DARK_STYLES +
    '</style>'
  );
}

/** DirectStay's footer: STAY CONNECTED and the support address, then the logo and address. */
function buildEmailFooter() {
  const support = escapeEmailHtml(process.env.EMAIL_SUPPORT_EMAIL || SUPPORT_EMAIL);
  const logo = escapeEmailHtml(process.env.EMAIL_LOGO_URL || `${ASSET_BASE()}/dwp-logo-dark.png`);
  return (
    '<table class="dwp-email-frame" role="presentation" width="890" align="center" cellpadding="0" cellspacing="0" border="0" style="width:890px;max-width:890px;margin:0 auto;">' +
    '<tr><td style="padding:0;">' +
    '<table role="presentation" width="890" cellpadding="0" cellspacing="0" border="0" style="width:890px;max-width:100%;"><tr><td height="20" style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr></table>' +
    `<table class="dwp-email-footer" role="presentation" width="890" cellpadding="0" cellspacing="0" border="0" bgcolor="${FOOTER_BG}" style="width:890px;max-width:100%;${FOOTER_BG_STYLE}color:#ffffff;font-family:Arial,Helvetica,sans-serif;">` +
    `<tr><td class="dwp-footer-cell" bgcolor="${FOOTER_BG}" style="${FOOTER_BG_STYLE}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    '<td class="dwp-footer-column dwp-footer-top-title" width="50%" align="left" style="padding:42px 0 0 46px;font-size:8px!important;line-height:20px;letter-spacing:3px;white-space:nowrap;color:#ffffff;-webkit-text-size-adjust:none;text-size-adjust:none;">' + keepWhite('STAY CONNECTED') + '</td>' +
    '<td class="dwp-footer-column dwp-footer-top-contact" width="50%" align="right" style="padding:42px 50px 0 0;font-size:8px!important;line-height:20px;white-space:nowrap;color:#ffffff;-webkit-text-size-adjust:none;text-size-adjust:none;">' +
    keepWhite('<span style="font-size:8px!important;letter-spacing:-0.25px;">Have any issues, contact</span> ' +
      `<a class="dwp-footer-link" href="mailto:${support}" style="color:${FOOTER_ACCENT};font-size:8px!important;text-decoration:none;letter-spacing:0.32px;">${support}</a>`) +
    '</td>' +
    '</tr><tr>' +
    '<td class="dwp-footer-bottom" colspan="2" align="left" valign="middle" style="padding:61px 47px 42px 55px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td width="110" valign="middle" style="width:110px;line-height:0;"><img src="${logo}" width="110" height="44" alt="Digital Wealth Partners" style="display:block;width:110px;height:44px;border:0;" /></td>` +
    '<td class="dwp-footer-address" valign="middle" style="padding-left:20px;font-size:15px;line-height:18px;color:#ffffff;">' +
    keepWhite('<strong style="letter-spacing:0.25px;">Digital Wealth Partners LLC</strong><br />' +
      '<span style="letter-spacing:-0.15px;">Dallas, T<span style="font-size:0;line-height:0;">&#8203;</span>exas</span><br />' +
      '<span style="font-size:14px;letter-spacing:1px;">United States</span>') +
    '</td>' +
    '</tr></table></td></tr></table></td></tr></table>' +
    '</td></tr></table>'
  );
}

/** The whole email for a model ({ hero, eyebrow, title, paragraphs, details, callout(s), action, … }). */
function renderEmailTemplate(model) {
  const preheader = model.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(model.preheader)}</div>`
    : '';
  const name = model.hero || 'notice';
  const lightHero = model.heroUrl || hero(name);
  // The dark banner is hidden unless the app is in dark mode (and is left out for a custom hero).
  const darkHero = model.heroUrl ? '' :
    `<div class="dwp-hero-dark" style="display:none;max-height:0;overflow:hidden;mso-hide:all;"><img src="${escapeEmailHtml(hero(name, true))}" width="890" alt="" style="display:block;width:890px;max-width:100%;height:auto;border:0;" /></div>`;
  return (
    '<!DOCTYPE html><html lang="en" style="height:100%;"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width,initial-scale=1" />' +
    '<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />' +
    '<meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" />' +
    `<title>${escapeEmailHtml(model.title)}</title>` +
    buildHeadStyles() +
    // "body" is the class Gmail's dark-mode fix above looks for.
    '</head><body class="body dwp-page" style="margin:0;padding:0;height:100%;background-color:#ffffff;">' +
    preheader +
    // A full-height table: the message at the top, the footer pushed to the bottom of the window.
    '<table class="dwp-page" role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;height:100%;min-height:100%;background-color:#ffffff;">' +
    '<tr><td valign="top" style="padding:0;vertical-align:top;">' +
    '<table class="dwp-email-frame" role="presentation" width="890" align="center" cellpadding="0" cellspacing="0" border="0" style="width:890px;max-width:100%;margin:0 auto;background-color:#ffffff;">' +
    // The hero is decorative (the heading below says the same), so its alt is empty on purpose.
    `<tr><td style="padding:0;"><img class="dwp-hero-light" src="${escapeEmailHtml(lightHero)}" width="890" alt="" style="display:block;width:890px;max-width:100%;height:auto;border:0;" />${darkHero}</td></tr>` +
    `<tr><td class="dwp-content" role="article" aria-label="${escapeEmailHtml(model.title)}" style="padding:24px 32px 34px;font-family:Arial,Helvetica,sans-serif;color:#171b22;"><!--dwp-content-->${renderContent(model)}<!--/dwp-content--></td></tr></table>` +
    '</td></tr>' +
    `<tr><td valign="bottom" style="padding:0;vertical-align:bottom;height:1px;">${buildEmailFooter()}</td></tr>` +
    '</table>' +
    '</body></html>'
  ).trim();
}

/**
 * The plain-text part, made from the HTML so the two parts never say different things: links
 * become "Label: https://…", detail rows "Label: value", list items "- item".
 */
function emailHtmlToText(html) {
  const stripTags = (value) => value.replace(/<[^>]+>/g, '');
  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' };
  const decode = (value) => value.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (match, code) => {
    if (code[0] === '#') {
      const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : +code.slice(1);
      return Number.isFinite(point) && point !== 8203 ? String.fromCodePoint(point) : '';
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
  const linkText = (href, label) => {
    const name = label.replace(/\s+/g, ' ').trim();
    if (!name || name === href) return href;
    if (href.startsWith('mailto:')) return `${name} (${href.slice(7)})`;
    return `${name}: ${href}`;
  };
  const body = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<div[^>]*display:none[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
      const link = linkText(decode(href), stripTags(inner));
      // A button (display:block) is its own line; an inline link stays in its sentence.
      return /display:block/.test(_m) ? `\n${link}\n` : link;
    })
    .replace(/<img\b[^>]*alt="([^"]+)"[^>]*>/gi, '$1')
    .replace(/<\/t[hd]>\s*<t[hd]\b[^>]*>/gi, ': ')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|tr|li|div|ul|ol|table)>/gi, '\n');
  return decode(stripTags(body))
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** { html, text } for a model, ready for nodemailer. */
function buildEmail(model) {
  const html = renderEmailTemplate(model);
  // The text part is the message itself plus a one-line footer (the HTML footer is layout).
  const support = process.env.EMAIL_SUPPORT_EMAIL || SUPPORT_EMAIL;
  const text = `${emailHtmlToText(renderContent(model))}\n\n--\nDigital Wealth Partners LLC · Dallas, Texas\nQuestions: ${support}`;
  return { html, text };
}

module.exports = { buildEmail, renderEmailTemplate, emailHtmlToText, escapeEmailHtml, hero, HERO_NAMES, ACCENT, SUPPORT_EMAIL };
