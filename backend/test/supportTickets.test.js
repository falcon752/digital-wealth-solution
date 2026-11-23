const test = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { serializeTicket, advisorCard, clientSummary, profileUpdate, ticketFilterFromQuery } = require('../src/utils/supportTickets');
const { models, render } = require('../src/utils/supportEmails');

const clientId = new Types.ObjectId();
const advisorId = new Types.ObjectId();
const adminId = new Types.ObjectId();
const people = new Map([
  [String(clientId), { _id: clientId, firstName: 'Tom', lastName: 'Example', email: 'tom@example.com', balance: 5000, password: 'hash' }],
  [String(advisorId), { _id: advisorId, firstName: 'Ashley', lastName: 'Papa', email: 'a@dwp', advisorProfile: { title: 'Senior Advisor', photo: 'p.jpg' } }],
  [String(adminId), { _id: adminId, firstName: 'Super', lastName: 'Admin', role: 'admin' }],
]);
const ticket = {
  _id: new Types.ObjectId(), reference: 'T-ABC123', userId: clientId, advisorId, subject: 'Help', category: 'deposit',
  priority: 'normal', status: 'open', unreadForClient: true, unreadForAdvisor: false, lastMessageAt: new Date(),
  messages: [
    { _id: new Types.ObjectId(), authorId: clientId, authorRole: 'client', body: 'Hi', createdAt: new Date() },
    { _id: new Types.ObjectId(), authorId: advisorId, authorRole: 'advisor', body: 'Hello', createdAt: new Date() },
    { _id: new Types.ObjectId(), authorId: adminId, authorRole: 'admin', body: 'Admin note', createdAt: new Date() },
  ],
};

test('a client sees their own messages as theirs, no client record, and admins as "DWP Support"', () => {
  const out = serializeTicket(ticket, people, 'client');
  assert.equal(out.client, undefined);
  assert.equal(out.unread, true);
  assert.deepEqual(out.messages.map((m) => m.mine), [true, false, false]);
  assert.equal(out.messages[2].authorName, 'DWP Support');
});

test('an advisor sees the client summary without financial or secret fields', () => {
  const out = serializeTicket(ticket, people, 'advisor');
  assert.equal(out.client.email, 'tom@example.com');
  assert.equal('balance' in out.client, false);
  assert.equal('password' in out.client, false);
  assert.deepEqual(out.messages.map((m) => m.mine), [false, true, false]);
  assert.equal(out.unread, false);
});

test('lists carry a preview, not the thread', () => {
  const out = serializeTicket(ticket, people, 'advisor', { withMessages: false });
  assert.equal(out.messages, undefined);
  assert.equal(out.lastMessage.body, 'Admin note');
});

test('the advisor card and client summary only pick public fields', () => {
  const card = advisorCard({ _id: advisorId, firstName: 'A', lastName: 'B', email: 'a@b', password: 'x', advisorProfile: {} });
  assert.equal(card.title, 'Client Advisor');
  assert.equal('password' in card, false);
  assert.equal('balance' in clientSummary(people.get(String(clientId))), false);
});

test('profile updates map to advisorProfile paths and clear empty fields', () => {
  assert.deepEqual(profileUpdate({ title: 'Lead', phone: '', isAvailable: false }, { filename: 'f.jpg' }), {
    'advisorProfile.title': 'Lead', 'advisorProfile.phone': null, 'advisorProfile.isAvailable': false, 'advisorProfile.photo': 'f.jpg',
  });
});

test('status filters', () => {
  assert.deepEqual(ticketFilterFromQuery({ status: 'active' }, { advisorId: 1 }), { advisorId: 1, status: { $in: ['open', 'in_progress'] } });
  assert.deepEqual(ticketFilterFromQuery({ status: 'bogus', unread: '1' }), { unreadForAdvisor: true });
});

test('emails escape what clients write and never include a password', () => {
  const t = { id: 'x', reference: 'T-1', subject: '<b>s</b>', category: 'other', priority: 'normal' };
  const client = { firstName: '<i>Tom</i>', lastName: 'E', email: 'tom@example.com' };
  const { html } = render(models.newTicket({ ticket: t, client, message: { body: '<script>alert(1)</script>' } }));
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<i>Tom</i>'), false);
  const welcome = render(models.advisorWelcome({ advisor: { firstName: 'A', email: 'a@dwp', advisorProfile: {} } }));
  assert.match(welcome.text, /never send passwords/);
});
