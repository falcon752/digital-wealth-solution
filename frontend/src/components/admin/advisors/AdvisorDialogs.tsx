'use client';

/**
 * The advisor dialogs the admin uses on /admin/advisors and /admin/advisors/<id>: create or edit
 * an advisor (with the card clients see), choose which clients they look after, and deactivate or
 * reactivate them. Nothing is deleted.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import { SearchField } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { getApiError } from '@/lib/apiError';
import { adminAdvisorsAPI, uploadUrl, type AdvisorAccount, type AdvisorWithStats, type ClientSummary } from '@/lib/supportApi';

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

/* ─── Create / edit ─────────────────────────────────────────────────────────── */

export function AdvisorFormDialog({ advisor, open, onClose, onSaved }: {
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

export function ClientsDialog({ advisor, onClose, onSaved }: { advisor: AdvisorWithStats | null; onClose: () => void; onSaved: () => void }) {
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

/* ─── Deactivate / reactivate ───────────────────────────────────────────────── */

/** Confirms deactivating or reactivating an advisor, then calls the API. */
export function AdvisorStatusDialog({ advisor, onClose, onChanged }: {
  advisor: Pick<AdvisorAccount, 'id' | 'name' | 'isActive'> | null; onClose: () => void; onChanged: () => void;
}) {
  // ConfirmDialog shows its own spinner and keeps the dialog open with the error if this throws.
  const confirm = async () => {
    if (!advisor) return;
    await adminAdvisorsAPI.setActive(advisor.id, !advisor.isActive);
    toast.success(advisor.isActive ? `${advisor.name} deactivated` : `${advisor.name} reactivated`);
    onChanged();
  };
  return (
    <ConfirmDialog
      open={Boolean(advisor)}
      onClose={onClose}
      onConfirm={confirm}
      title={advisor?.isActive ? `Deactivate ${advisor?.name}?` : `Reactivate ${advisor?.name}?`}
      message={advisor?.isActive
        ? 'They are signed out and can no longer use the advisor console. Their clients and tickets are kept; their clients see "An advisor will be assigned soon" and new tickets go to the unassigned queue until you reassign them.'
        : 'They can sign in to the advisor console again and their clients see their card again.'}
      confirmLabel={advisor?.isActive ? 'Deactivate' : 'Reactivate'}
      tone={advisor?.isActive ? 'error' : 'success'}
    />
  );
}
