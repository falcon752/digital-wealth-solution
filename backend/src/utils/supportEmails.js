/**
 * Emails for support tickets and advisor accounts, in DWP's layout (./emailLayout). The transport
 * mirrors utils/email.js: the Namecheap support mailbox, never Gmail, from support@.
 *
 * Callers send these through sendQuietly (utils/supportTickets.js), so a mail failure never fails
 * or slows the request.
 */
const nodemailer = require('nodemailer');
const { buildEmail, emailHtmlToText } = require('./emailLayout');

const SUPPORT_EMAIL = 'support@digitalwealthpartnersllc.net';
const PRIVATE_EMAIL_HOST = 'mail.privateemail.com';
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/New_York';

function createTransporter() {
  const host = process.env.SMTP_HOST || PRIVATE_EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const user = process.env.SMTP_USER || SUPPORT_EMAIL;
  if (/gmail/i.test(host) || /gmail/i.test(user)) {
    throw new Error('Email delivery must use the Namecheap support mailbox, not Gmail.');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: process.env.SMTP_PASS },
    // A slow or unreachable mail server must not keep sockets open for minutes.
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

function from() {
  const value = process.env.EMAIL_FROM || `Digital Wealth Partners <${SUPPORT_EMAIL}>`;
  if (!value.includes(SUPPORT_EMAIL)) throw new Error(`EMAIL_FROM must use ${SUPPORT_EMAIL}.`);
  return value;
}

const appUrl = () => (process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net').replace(/\/$/, '');
const nowEt = () => `${new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' })} ET`;
const nameOf = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
const CATEGORY_LABELS = {
  account: 'Account', deposit: 'Deposit', withdrawal: 'Withdrawal', kyc: 'Identity verification (KYC)',
  llc: 'LLC formation', lending: 'Lending', cards: 'Cards', other: 'Other',
};
const preview = (body, max = 140) => {
  const flat = String(body || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

/** The model for each email, kept separate from sending so it can be rendered to a file for review. */
const models = {
  /** A client opened a ticket: to their advisor (or to the admin team when they have none). */
  newTicket({ ticket, client, message, toAdmin = false }) {
    const url = toAdmin ? `${appUrl()}/admin/support/${ticket.id}` : `${appUrl()}/advisor/tickets/${ticket.id}`;
    return {
      subject: `[${ticket.reference}] New ticket from ${nameOf(client)}: ${ticket.subject}`,
      model: {
        hero: 'admin',
        preheader: `${nameOf(client)} opened a support ticket: ${preview(message.body, 90)}`,
        eyebrow: toAdmin ? 'Unassigned ticket' : 'New support ticket',
        title: toAdmin ? 'A client without an advisor needs help' : 'Your client opened a ticket',
        paragraphs: [
          toAdmin
            ? { html: `<strong>${esc(nameOf(client))}</strong> has no advisor yet, so this ticket is waiting in the admin support queue. Reply there or assign the client to an advisor.` }
            : { html: `<strong>${esc(nameOf(client))}</strong> needs your help. Please reply from your advisor console; they will get your answer by email.` },
        ],
        details: [
          { label: 'Ticket', value: ticket.reference },
          { label: 'Subject', value: ticket.subject },
          { label: 'Category', value: CATEGORY_LABELS[ticket.category] || ticket.category },
          { label: 'Priority', value: ticket.priority === 'high' ? 'High' : 'Normal' },
          { label: 'Client', value: `${nameOf(client)} (${client.email})` },
          { label: 'Opened', value: nowEt() },
        ],
        detailsVariant: 'card',
        quote: message.body,
        action: { label: 'Open the ticket', url },
        supporting: ['Replies are sent to the client from support@digitalwealthpartnersllc.net. Do not reply to this email directly.'],
      },
    };
  },

  /** The client wrote again in an existing ticket: to the advisor (or admin team). */
  clientMessage({ ticket, client, message, toAdmin = false }) {
    const url = toAdmin ? `${appUrl()}/admin/support/${ticket.id}` : `${appUrl()}/advisor/tickets/${ticket.id}`;
    return {
      subject: `[${ticket.reference}] New message from ${nameOf(client)}: ${ticket.subject}`,
      model: {
        hero: 'admin',
        preheader: `${nameOf(client)}: ${preview(message.body, 100)}`,
        eyebrow: 'Support ticket',
        title: 'New message from your client',
        paragraphs: [{ html: `<strong>${esc(nameOf(client))}</strong> replied in ticket <strong>${esc(ticket.reference)}</strong> (${esc(ticket.subject)}).` }],
        quote: message.body,
        action: { label: 'Reply in the console', url },
        supporting: [`Received ${nowEt()}.`],
      },
    };
  },

  /** An advisor or admin answered: to the client. */
  reply({ ticket, client, message, authorName, authorTitle }) {
    return {
      subject: `[${ticket.reference}] ${authorName} replied: ${ticket.subject}`,
      model: {
        hero: 'notice',
        preheader: `${authorName}: ${preview(message.body, 100)}`,
        eyebrow: 'Support ticket',
        title: 'You have a new reply',
        paragraphs: [
          { html: `Hi <strong>${esc(client.firstName || 'there')}</strong>,` },
          { html: `<strong>${esc(authorName)}</strong>${authorTitle ? `, ${esc(authorTitle)},` : ''} replied to your ticket <strong>${esc(ticket.reference)}</strong> (${esc(ticket.subject)}).` },
        ],
        quote: message.body,
        action: { label: 'View the conversation', url: `${appUrl()}/dashboard/support/${ticket.id}` },
        supporting: [
          'To answer, sign in and reply in the ticket so your advisor keeps the whole conversation in one place.',
          'Digital Wealth Partners will never ask for your password or recovery phrase.',
        ],
      },
    };
  },

  /** The ticket was marked resolved: to the client. */
  resolved({ ticket, client, authorName }) {
    return {
      subject: `[${ticket.reference}] Resolved: ${ticket.subject}`,
      model: {
        hero: 'notice',
        preheader: `${authorName} marked your ticket ${ticket.reference} as resolved.`,
        eyebrow: 'Support ticket',
        title: 'Your ticket is resolved',
        paragraphs: [
          { html: `Hi <strong>${esc(client.firstName || 'there')}</strong>,` },
          { html: `<strong>${esc(authorName)}</strong> marked your ticket <strong>${esc(ticket.reference)}</strong> (${esc(ticket.subject)}) as resolved.` },
          'If something still isn’t right, reply in the ticket and it will reopen for your advisor.',
        ],
        action: { label: 'View the ticket', url: `${appUrl()}/dashboard/support/${ticket.id}` },
      },
    };
  },

  /** An admin created an advisor account: to the advisor. The password is never emailed. */
  advisorWelcome({ advisor }) {
    return {
      subject: 'Your Digital Wealth Partners advisor account',
      model: {
        hero: 'notice',
        preheader: 'Your advisor console is ready. Sign in with the temporary password you were given.',
        eyebrow: 'Advisor account',
        title: 'Welcome to the advisor console',
        paragraphs: [
          { html: `Hi <strong>${esc(advisor.firstName || 'there')}</strong>,` },
          'An administrator created your Digital Wealth Partners advisor account. From the advisor console you can answer your clients’ support tickets, keep track of what you have resolved and update the profile card your clients see.',
        ],
        details: [
          { label: 'Sign-in email', value: advisor.email },
          { label: 'Role', value: advisor.advisorProfile?.title || 'Client Advisor' },
        ],
        detailsVariant: 'card',
        callout: {
          title: 'Your first sign-in',
          text: 'Use the temporary password the administrator gave you, then change it under Profile → Password. For your security we never send passwords by email.',
        },
        action: { label: 'Sign in', url: `${appUrl()}/login` },
      },
    };
  },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** The layout's plain-text part with a blank line between paragraphs (as utils/email.js does). */
function readableText(html, text) {
  const match = html.match(/<!--dwp-content-->([\s\S]*)<!--\/dwp-content-->/);
  if (!match) return text;
  const plain = emailHtmlToText(match[1]);
  if (!text.startsWith(plain)) return text;
  return emailHtmlToText(match[1].replace(/<\/(p|h1|div)>/gi, '</$1>\n')) + text.slice(plain.length);
}

function render({ model }) {
  const { html, text } = buildEmail(model);
  return { html, text: readableText(html, text) };
}

async function send(to, email) {
  if (!to) return null;
  const { html, text } = render(email);
  return createTransporter().sendMail({ from: from(), to, subject: email.subject, html, text });
}

const adminInbox = () => process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || SUPPORT_EMAIL;

module.exports = {
  models,
  render,
  sendNewTicketEmail: ({ advisor, ...rest }) =>
    send(advisor ? advisor.email : adminInbox(), models.newTicket({ ...rest, toAdmin: !advisor })),
  sendClientMessageEmail: ({ advisor, ...rest }) =>
    send(advisor ? advisor.email : adminInbox(), models.clientMessage({ ...rest, toAdmin: !advisor })),
  sendTicketReplyEmail: (args) => send(args.client.email, models.reply(args)),
  sendTicketResolvedEmail: (args) => send(args.client.email, models.resolved(args)),
  sendAdvisorWelcomeEmail: (args) => send(args.advisor.email, models.advisorWelcome(args)),
};
