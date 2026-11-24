/**
 * Support tickets and advisors: the client (/api/support), advisor console (/api/advisor) and
 * admin (/api/admin/advisors) endpoints, with their types. Uses the shared axios instance, so the
 * token and the 401 handling are the same as everywhere else.
 */
import api, { apiBase } from './api';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'account' | 'deposit' | 'withdrawal' | 'kyc' | 'llc' | 'lending' | 'cards' | 'portfolio' | 'other';
export type TicketPriority = 'normal' | 'high';

export interface AdvisorCardData {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  title: string;
  photo: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  state: string | null;
  address: string | null;
  bio: string | null;
  isAvailable: boolean;
}

export interface AdvisorAccount extends AdvisorCardData {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCounts {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  unread?: number;
  unassigned?: number;
}

export interface AdvisorWithStats extends AdvisorAccount {
  stats: {
    clients: number;
    tickets: TicketCounts;
    resolvedThisMonth: number;
    lastSignInAt: string | null;
    /** Only on GET /admin/advisors/:id: average time to the advisor's first reply. */
    firstReply?: { averageMs: number | null; tickets: number };
  };
}

export interface ClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  photo: string | null;
  clientSince: string;
  kycStatus?: string;
  accountActive?: boolean;
  assignedToYou?: boolean;
  onboardingFeePaid?: boolean;
  tickets?: TicketCounts;
  advisor?: { id: string; name: string; isActive: boolean } | null;
}

export interface TicketMessage {
  id: string;
  authorRole: 'client' | 'advisor' | 'admin';
  authorName: string;
  mine: boolean;
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  reference: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messageCount: number;
  lastMessageAt: string;
  lastMessage: { body: string; authorRole: TicketMessage['authorRole']; createdAt: string } | null;
  unread: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  advisor: { id: string; name: string; title: string; photo: string | null } | null;
  client?: ClientSummary | null;
  unreadForClient?: boolean;
  unreadForAdvisor?: boolean;
  clientAdvisorId?: string | null;
  messages?: TicketMessage[];
}

export interface AdvisorStats {
  open: number;
  inProgress: number;
  resolvedThisMonth: number;
  resolvedTotal: number;
  unread: number;
  clients: number;
  highPriority: number;
}

export interface ActivityRow {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

/** An activity log entry on an admin details page (who did it, from where). */
export interface AdminActivityEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string; role: string } | null;
}

export type TicketQuery = {
  status?: string;
  category?: string;
  priority?: string;
  unread?: '1';
  search?: string;
  clientId?: string;
  advisorId?: string;
  unassigned?: '1';
  page?: number;
  limit?: number;
};

const clean = <T extends Record<string, unknown>>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '')) as Partial<T>;

// ─── Client ────────────────────────────────────────────────────────────────
export const supportAPI = {
  advisor: () => api.get<{ advisor: AdvisorCardData | null }>('/support/advisor'),
  tickets: (status?: 'active' | 'done') =>
    api.get<{ tickets: Ticket[]; counts: { active: number; done: number; unread: number } }>('/support/tickets', { params: clean({ status }) }),
  create: (data: { subject: string; category: TicketCategory; message: string }) =>
    api.post<{ ticket: Ticket }>('/support/tickets', data),
  get: (id: string) => api.get<{ ticket: Ticket }>(`/support/tickets/${id}`),
  reply: (id: string, message: string) => api.post<{ ticket: Ticket }>(`/support/tickets/${id}/messages`, { message }),
  close: (id: string) => api.post<{ ticket: Ticket }>(`/support/tickets/${id}/close`),
};

// ─── Advisor console ───────────────────────────────────────────────────────
export const advisorAPI = {
  me: () => api.get<{ advisor: AdvisorAccount }>('/advisor/me'),
  updateMe: (data: FormData) =>
    api.put<{ advisor: AdvisorAccount; message: string }>('/advisor/me', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  stats: () => api.get<{ stats: AdvisorStats }>('/advisor/stats'),
  clients: (search?: string) => api.get<{ clients: ClientSummary[] }>('/advisor/clients', { params: clean({ search }) }),
  tickets: (params: TicketQuery = {}) =>
    api.get<{ tickets: Ticket[]; total: number; page: number; limit: number; counts: TicketCounts }>('/advisor/tickets', { params: clean(params) }),
  ticket: (id: string) => api.get<{ ticket: Ticket; client: ClientSummary | null }>(`/advisor/tickets/${id}`),
  reply: (id: string, message: string, status?: TicketStatus) =>
    api.post<{ ticket: Ticket }>(`/advisor/tickets/${id}/messages`, clean({ message, status })),
  // PUT: the API's CORS settings don't allow PATCH from the browser (PATCH works the same server-side).
  update: (id: string, data: { status?: TicketStatus; priority?: TicketPriority }) =>
    api.put<{ ticket: Ticket }>(`/advisor/tickets/${id}`, data),
};

// ─── Admin ─────────────────────────────────────────────────────────────────
export const adminAdvisorsAPI = {
  list: (params: { search?: string; status?: string } = {}) =>
    api.get<{ advisors: AdvisorWithStats[]; summary: { unassignedTickets: number; unassignedClients: number } }>('/admin/advisors', { params: clean(params) }),
  get: (id: string) =>
    api.get<{ advisor: AdvisorWithStats; clients: ClientSummary[]; tickets: Ticket[]; ticketTotal: number; activity: AdminActivityEntry[] }>(`/admin/advisors/${id}`),
  create: (data: FormData) =>
    api.post<{ advisor: AdvisorWithStats }>('/admin/advisors', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) =>
    api.put<{ advisor: AdvisorWithStats }>(`/admin/advisors/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  setActive: (id: string, isActive: boolean) => api.put<{ advisor: AdvisorAccount }>(`/admin/advisors/${id}/status`, { isActive }),
  setClients: (id: string, userIds: string[]) =>
    api.put<{ added: number; removed: number; clients: number }>(`/admin/advisors/${id}/clients`, { userIds }),
  clients: (params: { search?: string; advisorId?: string; unassigned?: '1'; limit?: number } = {}) =>
    api.get<{ clients: ClientSummary[] }>('/admin/advisors/clients', { params: clean(params) }),
  assignClient: (userId: string, advisorId: string | null) => api.put(`/admin/advisors/clients/${userId}`, { advisorId }),
  tickets: (params: TicketQuery = {}) =>
    api.get<{ tickets: Ticket[]; total: number; page: number; limit: number; counts: TicketCounts }>('/admin/advisors/tickets', { params: clean(params) }),
  ticket: (id: string) => api.get<{ ticket: Ticket; activity: AdminActivityEntry[] }>(`/admin/advisors/tickets/${id}`),
  reply: (id: string, message: string, status?: TicketStatus) =>
    api.post<{ ticket: Ticket }>(`/admin/advisors/tickets/${id}/messages`, clean({ message, status })),
  updateTicket: (id: string, data: { advisorId?: string | null; status?: TicketStatus; priority?: TicketPriority }) =>
    api.put<{ ticket: Ticket }>(`/admin/advisors/tickets/${id}`, data),
};

// ─── Display helpers ───────────────────────────────────────────────────────
export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'account', label: 'Account' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'kyc', label: 'Identity verification' },
  { value: 'llc', label: 'LLC formation' },
  { value: 'lending', label: 'Lending' },
  { value: 'cards', label: 'Cards' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Something else' },
];
export const categoryLabel = (value: string) => TICKET_CATEGORIES.find((c) => c.value === value)?.label || value;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed',
};

/** A file in the API's /uploads folder (photos are stored as file names). */
export const uploadUrl = (file: string | null | undefined) => (file ? `${apiBase}/uploads/${file}` : null);

/** tel:, WhatsApp and Telegram links for the contact fields as advisors type them. */
export function contactLinks(card: Pick<AdvisorCardData, 'phone' | 'whatsapp' | 'telegram' | 'email'>) {
  const digits = (value: string) => value.replace(/[^\d]/g, '');
  const whatsapp = card.whatsapp
    ? (/^https?:\/\//.test(card.whatsapp) ? card.whatsapp : `https://wa.me/${digits(card.whatsapp)}`)
    : null;
  let telegram: string | null = null;
  if (card.telegram) {
    if (/^https?:\/\//.test(card.telegram)) telegram = card.telegram;
    else if (/^[+\d]/.test(card.telegram)) telegram = `https://t.me/+${digits(card.telegram)}`;
    else telegram = `https://t.me/${card.telegram.replace(/^@/, '')}`;
  }
  return {
    phone: card.phone ? `tel:${card.phone.replace(/[^\d+]/g, '')}` : null,
    email: card.email ? `mailto:${card.email}` : null,
    whatsapp,
    telegram,
  };
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", then the date. */
export function timeAgo(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export const messageTime = (value: string) =>
  new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
