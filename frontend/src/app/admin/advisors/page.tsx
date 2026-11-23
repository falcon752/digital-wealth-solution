'use client';

/**
 * Advisors: DWP staff who look after clients' support tickets from /advisor. The admin creates
 * them (with a temporary password and the card clients see), edits them, deactivates or
 * reactivates them, chooses which clients each one looks after, and sees each one's numbers,
 * clients, recent tickets and activity. Nothing is deleted.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { getApiError } from '@/lib/apiError';
import {
  adminAdvisorsAPI, timeAgo, uploadUrl,
  type ActivityRow, type AdvisorWithStats, type ClientSummary, type Ticket,
} from '@/lib/supportApi';

type Input = ChangeEvent<HTMLInputElement>;

const PROFILE_FIELDS = ['title', 'phone', 'whatsapp', 'telegram', 'state', 'address', 'bio'] as const;
type FormState = {
  firstName: string; lastName: string; email: string; password: string; isAvailable: boolean;
} & Record<(typeof PROFILE_FIELDS)[number], string>;

const EMPTY_FORM: FormState = {
  firstName: '', lastName: '', email: '', password: '', isAvailable: true,
  title: 'Client Advisor', phone: '', whatsapp: '', telegram: '', state: '', address: '', bio: '',
};

/** A strong temporary password (meets the API's rule: upper, lower, digit, symbol). */
function generatePassword() {
  const pick = (set: string, n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => set[v % set.length]).join('');
  const raw = pick('ABCDEFGHJKLMNPQRSTUVWXYZ', 3) + pick('abcdefghijkmnpqrstuvwxyz', 5) + pick('23456789', 3) + pick('@$!%*?&', 1);
  return raw.split('').sort(() => (crypto.getRandomValues(new Uint8Array(1))[0] > 127 ? 1 : -1)).join('');
}

const ACTIVITY_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in',
  ADVISOR_TICKET_REPLIED: 'Replied to a ticket',
  ADVISOR_TICKET_REPLIED_RESOLVED: 'Replied and resolved a ticket',
  ADVISOR_TICKET_UPDATED: 'Changed a ticket',
  ADVISOR_PROFILE_UPDATED: 'Updated their profile',
  PASSWORD_CHANGED: 'Changed their password',
};

/* ─── Create / edit ─────────────────────────────────────────────────────────── */

function AdvisorFormDialog({ advisor, open, onClose, onSaved }: {
  advisor: AdvisorWithStats | null; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const accent = useAccent();
  const editing = Boolean(advisor);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    setPreview(null);
    setForm(advisor ? {
      firstName: advisor.firstName, lastName: advisor.lastName, email: advisor.email, password: '', isAvailable: advisor.isAvailable,
      title: advisor.title || '', phone: advisor.phone || '', whatsapp: advisor.whatsapp || '', telegram: advisor.telegram || '',
      state: advisor.state || '', address: advisor.address || '', bio: advisor.bio || '',
    } : { ...EMPTY_FORM, password: generatePassword() });
  }, [open, advisor]);

  const set = (field: keyof FormState) => (event: Input) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
    if (!editing && !form.password) { toast.error('Set a temporary password'); return; }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('firstName', form.firstName.trim());
      data.append('lastName', form.lastName.trim());
      data.append('email', form.email.trim());
      if (form.password) data.append('password', form.password);
      for (const field of PROFILE_FIELDS) data.append(field, form[field].trim());
      data.append('isAvailable', String(form.isAvailable));
      if (photo) data.append('photo', photo);
      if (advisor) await adminAdvisorsAPI.update(advisor.id, data);
      else await adminAdvisorsAPI.create(data);
      toast.success(advisor ? 'Advisor updated' : `Advisor created. Share the temporary password with ${form.firstName} securely.`, { duration: 6000 });
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save the advisor'));
    } finally {
      setSaving(false);
    }
  };

  const photoUrl = preview || uploadUrl(advisor?.photo);

  return (
    <AdminDialog
      isOpen={open}
      onClose={onClose}
      title={editing ? `Edit ${advisor?.name}` : 'New advisor'}
      size="lg"
      actions={
        <>
          <MDButton variant="text" color="dark" onClick={onClose} disabled={saving}>Cancel</MDButton>
          <MDButton variant="gradient" color={accent} onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create advisor'}</MDButton>
        </>
      }
    >
      <MDBox display="flex" alignItems="center" gap={2} mb={3}>
        <PersonAvatar name={`${form.firstName} ${form.lastName}`} email={form.email} photoUrl={photoUrl} size="xl" />
        <MDBox>
          <MDButton variant="outlined" color={accent} size="small" onClick={() => fileRef.current?.click()}>
            <Icon>photo_camera</Icon>&nbsp;{photoUrl ? 'Change photo' : 'Add photo'}
          </MDButton>
          <MDTypography variant="caption" color="text" display="block" mt={0.75}>JPEG, PNG or WebP up to 5 MB. Clients see it on the advisor card.</MDTypography>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) { toast.error('The photo must be 5 MB or smaller'); return; }
              setPhoto(file);
              setPreview(URL.createObjectURL(file));
            }}
          />
        </MDBox>
      </MDBox>

      <MDTypography variant="button" fontWeight="bold" display="block" mb={1.5}>Account</MDTypography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}><MDInput fullWidth label="First name" value={form.firstName} onChange={set('firstName')} required /></Grid>
        <Grid item xs={12} sm={6}><MDInput fullWidth label="Last name" value={form.lastName} onChange={set('lastName')} required /></Grid>
        <Grid item xs={12} sm={6}><MDInput fullWidth type="email" label="Sign-in email" value={form.email} onChange={set('email')} required /></Grid>
        <Grid item xs={12} sm={6}>
          <MDInput
            fullWidth
            label={editing ? 'New temporary password (optional)' : 'Temporary password'}
            value={form.password}
            onChange={set('password')}
            helperText={editing ? 'Leave empty to keep their password.' : 'Not emailed. Share it securely; they change it under Profile.'}
            InputProps={{
              endAdornment: (
                <Tooltip title="Generate">
                  <IconButton size="small" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))} aria-label="Generate password">
                    <Icon fontSize="small">refresh</Icon>
                  </IconButton>
                </Tooltip>
              ),
            }}
          />
        </Grid>
      </Grid>

      <MDTypography variant="button" fontWeight="bold" display="block" mb={1.5}>Card clients see</MDTypography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}><MDInput fullWidth label="Title" value={form.title} onChange={set('title')} placeholder="Client Advisor" /></Grid>
        <Grid item xs={12} sm={6}><MDInput fullWidth label="Phone" value={form.phone} onChange={set('phone')} placeholder="+1 214 555 0100" /></Grid>
        <Grid item xs={12} sm={6}><MDInput fullWidth label="WhatsApp" value={form.whatsapp} onChange={set('whatsapp')} placeholder="+234 803 555 0100 or wa.me link" /></Grid>
        <Grid item xs={12} sm={6}><MDInput fullWidth label="Telegram" value={form.telegram} onChange={set('telegram')} placeholder="@username" /></Grid>
        <Grid item xs={12} sm={4}><MDInput fullWidth label="State" value={form.state} onChange={set('state')} /></Grid>
        <Grid item xs={12} sm={8}><MDInput fullWidth label="Office address" value={form.address} onChange={set('address')} /></Grid>
        <Grid item xs={12}><MDInput fullWidth multiline minRows={2} label="Short introduction" value={form.bio} onChange={set('bio')} inputProps={{ maxLength: 600 }} /></Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={form.isAvailable} onChange={(_, checked) => setForm((f) => ({ ...f, isAvailable: checked }))} />}
            label={<MDTypography variant="button" color="text">Shown as available</MDTypography>}
          />
        </Grid>
      </Grid>
    </AdminDialog>
  );
}

/* ─── Assigned clients ──────────────────────────────────────────────────────── */

function ClientsDialog({ advisor, onClose, onSaved }: { advisor: AdvisorWithStats | null; onClose: () => void; onSaved: () => void }) {
  const accent = useAccent();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ClientSummary[] | null>(null);
  const [search, setSearch] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!advisor) return;
    setSearch('');
    setOnlyUnassigned(false);
    adminAdvisorsAPI.clients({ advisorId: advisor.id, limit: 500 })
      .then((res) => { const ids = new Set(res.data.clients.map((c) => c.id)); setSelected(ids); setInitial(ids); })
      .catch((err) => toast.error(getApiError(err, 'Failed to load assigned clients')));
  }, [advisor]);

  useEffect(() => {
    if (!advisor) return;
    setResults(null);
    adminAdvisorsAPI.clients({ search: search || undefined, unassigned: onlyUnassigned ? '1' : undefined, limit: 200 })
      .then((res) => setResults(res.data.clients))
      .catch(() => setResults([]));
  }, [advisor, search, onlyUnassigned]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const added = [...selected].filter((id) => !initial.has(id)).length;
  const removed = [...initial].filter((id) => !selected.has(id)).length;

  const save = async () => {
    if (!advisor) return;
    setSaving(true);
    try {
      const res = await adminAdvisorsAPI.setClients(advisor.id, [...selected]);
      toast.success(`${advisor.firstName} now looks after ${res.data.clients} ${res.data.clients === 1 ? 'client' : 'clients'}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update the clients'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDialog
      isOpen={Boolean(advisor)}
      onClose={onClose}
      title={`Clients of ${advisor?.name || ''}`}
      size="lg"
      actions={
        <>
          <MDTypography variant="caption" color="text" mr="auto" pl={1}>
            {selected.size} selected{added || removed ? ` · ${added} to add, ${removed} to remove` : ''}
          </MDTypography>
          <MDButton variant="text" color="dark" onClick={onClose} disabled={saving}>Cancel</MDButton>
          <MDButton variant="gradient" color={accent} onClick={() => void save()} disabled={saving || (!added && !removed)}>{saving ? 'Saving…' : 'Save'}</MDButton>
        </>
      }
    >
      <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={2}>
        Tick the clients {advisor?.firstName} looks after. Their open tickets move with them; resolved tickets stay with the advisor who handled them.
      </MDTypography>
      <MDBox display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <SearchField value={search} onChange={setSearch} placeholder="Search clients by name or email…" width="min(360px, 100%)" />
        <FormControlLabel
          control={<Switch checked={onlyUnassigned} onChange={(_, checked) => setOnlyUnassigned(checked)} />}
          label={<MDTypography variant="button" color="text">Only clients without an advisor</MDTypography>}
        />
      </MDBox>
      <MDBox borderRadius="lg" sx={({ palette }) => ({ border: `1px solid ${palette.divider}`, maxHeight: 420, overflowY: 'auto' })}>
        {!results ? (
          <MDBox p={2}>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={48} />)}</MDBox>
        ) : results.length === 0 ? (
          <MDBox p={4} textAlign="center">
            <Icon fontSize="large" sx={{ color: 'text.disabled' }}>search_off</Icon>
            <MDTypography variant="button" color="text" display="block" mt={1}>No clients match.</MDTypography>
          </MDBox>
        ) : results.map((client, i) => {
          const checked = selected.has(client.id);
          const elsewhere = client.advisor && client.advisor.id !== advisor?.id;
          return (
            <MDBox key={client.id}>
              {i > 0 && <Divider sx={{ my: 0 }} />}
              <MDBox
                component="label"
                display="flex"
                alignItems="center"
                gap={1.5}
                py={1}
                px={1.5}
                sx={({ palette, functions: { rgba } }) => ({
                  cursor: 'pointer',
                  backgroundColor: checked ? rgba(palette[accent].main, 0.08) : 'transparent',
                  '&:hover': { backgroundColor: rgba(palette[accent].main, checked ? 0.12 : 0.04) },
                })}
              >
                <Checkbox checked={checked} onChange={() => toggle(client.id)} sx={{ p: 0.5 }} />
                <PersonAvatar name={client.name} email={client.email} photoUrl={uploadUrl(client.photo)} size="xs" />
                <MDBox minWidth={0} flex={1} lineHeight={1.2}>
                  <MDTypography variant="button" fontWeight="medium" display="block" noWrap>{client.name}</MDTypography>
                  <MDTypography variant="caption" color="text" display="block" noWrap>
                    {client.email}{client.country ? ` · ${client.country}` : ''}
                  </MDTypography>
                </MDBox>
                {elsewhere ? (
                  <Tooltip title={checked ? `Will move from ${client.advisor!.name}` : 'Currently assigned elsewhere'}>
                    <span><StatusBadge status="in_progress" label={`With ${client.advisor!.name}`} color={checked ? 'warning' : 'secondary'} /></span>
                  </Tooltip>
                ) : client.advisor ? (
                  <StatusBadge status="assigned" label="Assigned" />
                ) : (
                  <StatusBadge status="none" label="No advisor" color="light" />
                )}
                {!client.onboardingFeePaid && <Tooltip title="Onboarding fee not confirmed yet"><Icon fontSize="small" color="warning">schedule</Icon></Tooltip>}
              </MDBox>
            </MDBox>
          );
        })}
      </MDBox>
    </AdminDialog>
  );
}

/* ─── One advisor's record ──────────────────────────────────────────────────── */

function AdvisorDetailDialog({ advisorId, onClose }: { advisorId: string | null; onClose: () => void }) {
  const [data, setData] = useState<{ advisor: AdvisorWithStats; clients: ClientSummary[]; tickets: Ticket[]; activity: ActivityRow[] } | null>(null);

  useEffect(() => {
    if (!advisorId) return;
    setData(null);
    adminAdvisorsAPI.get(advisorId)
      .then((res) => setData(res.data))
      .catch((err) => { toast.error(getApiError(err, 'Failed to load the advisor')); onClose(); });
  }, [advisorId, onClose]);

  const a = data?.advisor;
  return (
    <AdminDialog isOpen={Boolean(advisorId)} onClose={onClose} title={a ? a.name : 'Advisor'} size="xl">
      {!data || !a ? (
        <MDBox>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={40} />)}</MDBox>
      ) : (
        <>
          <MDBox display="flex" alignItems="center" gap={2} mb={3}>
            <PersonAvatar name={a.name} email={a.email} photoUrl={uploadUrl(a.photo)} size="xl" />
            <MDBox>
              <MDTypography variant="h6">{a.name}</MDTypography>
              <MDTypography variant="button" color="text" display="block">{a.title} · {a.email}</MDTypography>
              <MDBox mt={0.75} display="flex" gap={1}>
                <StatusBadge status={a.isActive ? 'active' : 'inactive'} />
                {!a.isAvailable && <StatusBadge status="away" label="Away" color="secondary" />}
              </MDBox>
            </MDBox>
          </MDBox>
          <DetailGrid items={[
            { label: 'Clients', value: a.stats.clients },
            { label: 'Open / in progress', value: `${a.stats.tickets.open} / ${a.stats.tickets.in_progress}` },
            { label: 'Resolved this month', value: a.stats.resolvedThisMonth },
            { label: 'Resolved in total', value: a.stats.tickets.resolved + a.stats.tickets.closed },
            { label: 'Phone', value: a.phone },
            { label: 'WhatsApp', value: a.whatsapp },
            { label: 'Telegram', value: a.telegram },
            { label: 'Last sign-in', value: a.stats.lastSignInAt ? new Date(a.stats.lastSignInAt).toLocaleString('en-US') : 'Never' },
            { label: 'Office', value: [a.address, a.state].filter(Boolean).join(' · '), span: 6 },
            { label: 'Advisor since', value: new Date(a.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }), span: 6 },
          ]} />

          <Divider sx={{ my: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>Clients ({data.clients.length})</MDTypography>
              {data.clients.length === 0 ? (
                <MDTypography variant="caption" color="text">No clients assigned.</MDTypography>
              ) : data.clients.map((c) => (
                <MDBox key={c.id} display="flex" alignItems="center" gap={1.5} py={0.75}>
                  <PersonAvatar name={c.name} email={c.email} photoUrl={uploadUrl(c.photo)} size="xs" />
                  <MDBox flex={1} minWidth={0} lineHeight={1.2}>
                    <MDTypography variant="button" fontWeight="medium" display="block" noWrap>{c.name}</MDTypography>
                    <MDTypography variant="caption" color="text" display="block" noWrap>{c.email}</MDTypography>
                  </MDBox>
                  <StatusBadge status={c.kycStatus} label={`KYC ${humanize(c.kycStatus).toLowerCase()}`} />
                  <MDTypography variant="caption" color="text" whiteSpace="nowrap">{c.tickets?.total || 0} tickets</MDTypography>
                </MDBox>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>Recent tickets</MDTypography>
              {data.tickets.length === 0 ? (
                <MDTypography variant="caption" color="text">No tickets yet.</MDTypography>
              ) : data.tickets.slice(0, 10).map((t) => (
                <MDBox key={t.id} component={Link} href={`/admin/support?ticket=${t.id}`} display="flex" alignItems="center" gap={1.5} py={0.75} sx={{ textDecoration: 'none' }}>
                  <MDBox flex={1} minWidth={0} lineHeight={1.2}>
                    <MDTypography variant="button" fontWeight="medium" display="block" noWrap>{t.subject}</MDTypography>
                    <MDTypography variant="caption" color="text" display="block" noWrap>{t.reference} · {t.client?.name} · {timeAgo(t.lastMessageAt)}</MDTypography>
                  </MDBox>
                  <StatusBadge status={t.status} />
                </MDBox>
              ))}
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>Activity</MDTypography>
          {data.activity.length === 0 ? (
            <MDTypography variant="caption" color="text">No activity yet.</MDTypography>
          ) : data.activity.slice(0, 20).map((row) => (
            <MDBox key={row.id} display="flex" justifyContent="space-between" gap={2} py={0.5}>
              <MDTypography variant="button" color="text">
                {ACTIVITY_LABELS[row.action] || humanize(row.action)}
                {row.details && typeof row.details.reference === 'string' ? ` · ${row.details.reference}` : ''}
                {row.details && typeof row.details.to === 'string' ? ` → ${humanize(row.details.to)}` : ''}
              </MDTypography>
              <MDTypography variant="caption" color="text" whiteSpace="nowrap">{new Date(row.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</MDTypography>
            </MDBox>
          ))}
        </>
      )}
    </AdminDialog>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function AdminAdvisorsPage() {
  const accent = useAccent();
  const [advisors, setAdvisors] = useState<AdvisorWithStats[]>([]);
  const [summary, setSummary] = useState({ unassignedTickets: 0, unassignedClients: 0 });
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('');
  const [editing, setEditing] = useState<AdvisorWithStats | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [clientsFor, setClientsFor] = useState<AdvisorWithStats | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdvisorWithStats | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminAdvisorsAPI.list({ search, status })
      .then((res) => { setAdvisors(res.data.advisors); setSummary(res.data.summary); })
      .catch(setError)
      .finally(() => { setLoading(false); setLoadedOnce(true); });
  }, [search, status]);
  useEffect(load, [load]);

  const closeDetail = useCallback(() => setDetailId(null), []);

  // ConfirmDialog shows its own spinner and keeps the dialog open with the error if this throws.
  const toggleActive = async () => {
    if (!toggleTarget) return;
    await adminAdvisorsAPI.setActive(toggleTarget.id, !toggleTarget.isActive);
    toast.success(toggleTarget.isActive ? `${toggleTarget.name} deactivated` : `${toggleTarget.name} reactivated`);
    setToggleTarget(null);
    load();
  };

  const totals = useMemo(() => advisors.reduce((acc, a) => ({
    active: acc.active + (a.isActive ? 1 : 0),
    clients: acc.clients + a.stats.clients,
    open: acc.open + a.stats.tickets.open + a.stats.tickets.in_progress,
    resolved: acc.resolved + a.stats.resolvedThisMonth,
  }), { active: 0, clients: 0, open: 0, resolved: 0 }), [advisors]);

  const columns: Column<AdvisorWithStats>[] = [
    {
      key: 'advisor',
      header: 'Advisor',
      render: (a) => (
        <MDBox display="flex" alignItems="center" gap={1.5}>
          <PersonAvatar name={a.name} email={a.email} photoUrl={uploadUrl(a.photo)} />
          <MDBox lineHeight={1.2} minWidth={0}>
            <MDTypography variant="button" fontWeight="medium" display="block">{a.name}</MDTypography>
            <MDTypography variant="caption" color="text" display="block">{a.title} · {a.email}</MDTypography>
            <MDBox display={{ xs: 'flex', md: 'none' }} gap={1} mt={0.75} alignItems="center">
              <MDTypography variant="caption" fontWeight="medium">{a.stats.clients} clients · {a.stats.tickets.open + a.stats.tickets.in_progress} active</MDTypography>
              <StatusBadge status={a.isActive ? 'active' : 'inactive'} />
            </MDBox>
          </MDBox>
        </MDBox>
      ),
    },
    { key: 'clients', header: 'Clients', hideOnMobile: true, align: 'center', render: (a) => a.stats.clients },
    {
      key: 'tickets',
      header: 'Active',
      hideOnMobile: true,
      align: 'center',
      render: (a) => (
        <MDBox component="span" whiteSpace="nowrap">
          {a.stats.tickets.open} · {a.stats.tickets.in_progress}
          {Boolean(a.stats.tickets.unread) && <MDTypography component="span" variant="caption" color="info" fontWeight="bold"> ({a.stats.tickets.unread} unread)</MDTypography>}
        </MDBox>
      ),
    },
    { key: 'resolved', header: 'Resolved', hideOnMobile: true, align: 'center', render: (a) => (
      <MDBox component="span" whiteSpace="nowrap">{a.stats.resolvedThisMonth} <MDTypography component="span" variant="caption" color="text">this month</MDTypography></MDBox>
    ) },
    { key: 'signin', header: 'Last seen', hideOnMobile: true, render: (a) => <MDBox component="span" whiteSpace="nowrap">{a.stats.lastSignInAt ? timeAgo(a.stats.lastSignInAt) : 'Never'}</MDBox> },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (a) => <StatusBadge status={a.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <MDBox display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="flex-end" gap={0.5}>
          <Tooltip title="Record and activity"><IconButton size="small" onClick={() => setDetailId(a.id)} aria-label="Record and activity"><Icon fontSize="small">visibility</Icon></IconButton></Tooltip>
          <Tooltip title="Assigned clients"><span><IconButton size="small" onClick={() => setClientsFor(a)} aria-label="Assigned clients" disabled={!a.isActive}><Icon fontSize="small">manage_accounts</Icon></IconButton></span></Tooltip>
          <Tooltip title="Tickets"><IconButton size="small" component={Link} href={`/admin/support?advisorId=${a.id}`} aria-label="Tickets"><Icon fontSize="small">forum</Icon></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditing(a); setFormOpen(true); }} aria-label="Edit"><Icon fontSize="small">edit</Icon></IconButton></Tooltip>
          <Tooltip title={a.isActive ? 'Deactivate' : 'Reactivate'}>
            <IconButton size="small" color={a.isActive ? 'success' : 'default'} onClick={() => setToggleTarget(a)} aria-label={a.isActive ? 'Deactivate' : 'Reactivate'}>
              <Icon>{a.isActive ? 'toggle_on' : 'toggle_off'}</Icon>
            </IconButton>
          </Tooltip>
        </MDBox>
      ),
    },
  ];

  const stats = [
    { title: 'Active advisors', value: totals.active, icon: 'support_agent', color: 'info' as const, label: `${advisors.length - totals.active} deactivated`, href: undefined },
    { title: 'Clients with an advisor', value: totals.clients, icon: 'group', color: 'success' as const, label: `${summary.unassignedClients} active clients without one`, href: undefined },
    { title: 'Active tickets', value: totals.open, icon: 'forum', color: 'warning' as const, label: `${totals.resolved} resolved this month`, href: '/admin/support' },
    { title: 'Unassigned tickets', value: summary.unassignedTickets, icon: 'inbox', color: summary.unassignedTickets ? 'error' as const : 'dark' as const, label: 'waiting for the admin team', href: '/admin/support?unassigned=1' },
  ];

  return (
    <AdminPage
      title="Advisors"
      description="DWP staff who answer their clients' support tickets"
      actions={<MDButton variant="gradient" color={accent} onClick={() => { setEditing(null); setFormOpen(true); }}><Icon>person_add</Icon>&nbsp;New advisor</MDButton>}
    >
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <MDBox mb={1.5}>
              <StatCard loading={loading && !loadedOnce} color={stat.color} icon={stat.icon} title={stat.title} value={stat.value} href={stat.href}
                footnote={{ label: stat.label, color: 'secondary' }} />
            </MDBox>
          </Grid>
        ))}
      </Grid>

      <MDBox mt={6}>
        <DataTableCard
          title="Advisors"
          subtitle={`${advisors.length} ${advisors.length === 1 ? 'advisor' : 'advisors'}`}
          columns={columns}
          rows={advisors}
          rowKey={(a) => a.id}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={error}
          onRetry={load}
          emptyMessage="No advisors yet. Create the first one to start assigning clients."
          toolbar={
            <>
              <SearchField value={search} onChange={setSearch} placeholder="Search by name, email or title…" width="min(320px, 100%)" />
              <SelectFilter label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Deactivated' }]} />
            </>
          }
        />
      </MDBox>

      <AdvisorFormDialog advisor={editing} open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <ClientsDialog advisor={clientsFor} onClose={() => setClientsFor(null)} onSaved={load} />
      <AdvisorDetailDialog advisorId={detailId} onClose={closeDetail} />
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={toggleActive}
        title={toggleTarget?.isActive ? `Deactivate ${toggleTarget?.name}?` : `Reactivate ${toggleTarget?.name}?`}
        message={toggleTarget?.isActive
          ? 'They are signed out and can no longer use the advisor console. Their clients and tickets are kept; their clients see "An advisor will be assigned soon" and new tickets go to the unassigned queue until you reassign them.'
          : 'They can sign in to the advisor console again and their clients see their card again.'}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'}
        tone={toggleTarget?.isActive ? 'error' : 'success'}
      />
    </AdminPage>
  );
}
