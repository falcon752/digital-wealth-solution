'use client';

/**
 * Add or edit a portfolio holding (a 401(k) at Fidelity, gold bars, an NFT…). Used on
 * /admin/holdings (with a client picker) and on /admin/users/<id> (client fixed). The API's
 * validation messages appear under the field they belong to.
 */
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import toast from 'react-hot-toast';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import { SearchField } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDAlert from '@/components/admin/components/MDAlert';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { errorMessage } from '@/components/admin/lib/errors';
import { adminAdvisorsAPI, uploadUrl, type ClientSummary } from '@/lib/supportApi';
import {
  adminHoldingsAPI, CATEGORY_OPTIONS, TYPE_SUGGESTIONS, UNIT_SUGGESTIONS, typeFromText, typeLabel,
  type Holding, type HoldingCategory, type HoldingInput,
} from './api';

type Input = ChangeEvent<HTMLInputElement>;
/** Same height as the other fields (Autocomplete adds its own padding around the input). */
const AUTOCOMPLETE_SX = {
  '& .MuiOutlinedInput-root.MuiInputBase-root': { padding: 0, paddingRight: '2rem' },
  '& .MuiOutlinedInput-root .MuiAutocomplete-input': { padding: '0.75rem' },
};
export type HoldingClient = { id: string; name: string; email: string; photoUrl?: string | null };

/** A date as the <input type="date"> value, in the admin's own time zone. */
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate(new Date());
/** Saved as midday local time, so the day shows the same in every time zone from UTC−11 to UTC+11. */
const toValuedAt = (day: string) => (day ? new Date(`${day}T12:00:00`).toISOString() : '');
const EMPTY: HoldingInput = {
  category: '', type: '', name: '', institution: '', accountLast4: '', symbol: '', quantity: '', unit: '',
  valueUsd: '', costBasisUsd: '', valuedAt: '', notes: '', adminNote: '',
};

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v));

function fromHolding(h: Holding): HoldingInput {
  return {
    category: h.category, type: str(h.type), name: h.name, institution: str(h.institution), accountLast4: str(h.accountLast4),
    symbol: str(h.symbol), quantity: str(h.quantity), unit: str(h.unit), valueUsd: str(h.valueUsd), costBasisUsd: str(h.costBasisUsd),
    valuedAt: h.valuedAt && !Number.isNaN(new Date(h.valuedAt).getTime()) ? localDate(new Date(h.valuedAt)) : '', notes: str(h.notes), adminNote: str(h.adminNote),
  };
}

type Errors = Partial<Record<keyof HoldingInput | 'client', string>>;

/** The API's 400 body ({ error, errors: [{ path, msg }] }) → a message per field. */
function apiFieldErrors(err: unknown): Errors {
  const list = (err as { response?: { data?: { errors?: { path?: string; param?: string; msg?: string }[] } } })?.response?.data?.errors;
  const out: Errors = {};
  for (const e of list ?? []) {
    const key = (e.path || e.param) as keyof Errors | undefined;
    if (key && e.msg && !out[key]) out[key === 'userId' ? 'client' : key] = e.msg;
  }
  return out;
}

export default function HoldingDialog({ open, onClose, onSaved, holding, client }: {
  open: boolean;
  onClose: () => void;
  onSaved: (holding: Holding) => void;
  /** Editing this holding; null/undefined adds a new one. */
  holding?: Holding | null;
  /** The client, when opened from their page (no picker). */
  client?: HoldingClient | null;
}) {
  const accent = useAccent();
  const editing = Boolean(holding);
  const [form, setForm] = useState<HoldingInput>(EMPTY);
  const [picked, setPicked] = useState<HoldingClient | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(holding ? fromHolding(holding) : { ...EMPTY, valuedAt: today() });
    setPicked(client ?? (holding?.client ? { ...holding.client } : null));
    setErrors({});
    setFailure(null);
  }, [open, holding, client]);

  const set = (field: keyof HoldingInput) => (event: Input) => {
    const value = event.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const setValue = (field: keyof HoldingInput, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  /** Props that show a field's error under it (MDInput only styles the box). */
  const err = (field: keyof Errors, help?: ReactNode) => ({
    error: Boolean(errors[field]),
    helperText: errors[field] ?? help,
    FormHelperTextProps: errors[field] ? { sx: { color: 'error.main' } } : undefined,
  });

  const validate = (): Errors => {
    const e: Errors = {};
    if (!editing && !picked) e.client = 'Choose a client';
    if (!form.category) e.category = 'Choose a category';
    if (form.name.trim().length < 2) e.name = 'Name is 2 to 120 characters';
    if (form.valueUsd.trim() === '' || !(Number(form.valueUsd) >= 0)) e.valueUsd = 'Enter the value in USD';
    if (form.accountLast4 && !/^[A-Za-z0-9]{1,4}$/.test(form.accountLast4)) e.accountLast4 = 'Up to the last 4 characters of the account';
    if (form.quantity && !(Number(form.quantity) >= 0)) e.quantity = 'Quantity must be 0 or more';
    if (form.costBasisUsd && !(Number(form.costBasisUsd) >= 0)) e.costBasisUsd = 'Cost basis must be 0 or more';
    return e;
  };

  const save = async () => {
    const local = validate();
    setErrors(local);
    setFailure(null);
    if (Object.keys(local).length) return;
    setSaving(true);
    const body: HoldingInput = {
      ...form,
      type: typeFromText(form.type),
      valuedAt: toValuedAt(form.valuedAt),
      name: form.name.trim(), institution: form.institution.trim(), accountLast4: form.accountLast4.trim(),
      symbol: form.symbol.trim().toUpperCase(), unit: form.unit.trim(), notes: form.notes.trim(), adminNote: form.adminNote.trim(),
    };
    try {
      const res = holding
        ? await adminHoldingsAPI.update(holding.id, body)
        : await adminHoldingsAPI.create({ ...body, userId: picked!.id });
      toast.success(holding ? 'Holding updated' : `Holding added for ${picked?.name || 'the client'}`);
      onSaved(res.data.holding);
      onClose();
    } catch (error) {
      const fields = apiFieldErrors(error);
      setErrors(fields);
      // Messages that aren't about one field (client not found, server error…) go above the buttons.
      if (!Object.keys(fields).length) setFailure(errorMessage(error, 'Failed to save the holding'));
    } finally {
      setSaving(false);
    }
  };

  const category = form.category as HoldingCategory | '';
  const typeOptions = category ? TYPE_SUGGESTIONS[category] : Object.values(TYPE_SUGGESTIONS).flat();
  const unitOptions = category ? UNIT_SUGGESTIONS[category] : [];

  return (
    <AdminDialog
      isOpen={open}
      onClose={() => !saving && onClose()}
      title={editing ? `Edit ${holding?.name}` : 'Add a holding'}
      size="lg"
      actions={
        <>
          <MDButton variant="text" color="dark" onClick={onClose} disabled={saving}>Cancel</MDButton>
          <MDButton variant="gradient" color={accent} onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add holding'}
          </MDButton>
        </>
      }
    >
      {/* Client */}
      <MDTypography variant="button" fontWeight="bold" display="block" mb={1.5}>Client</MDTypography>
      {picked ? (
        <MDBox display="flex" alignItems="center" gap={1.5} mb={3} p={1.5} borderRadius="lg" sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}>
          <PersonAvatar name={picked.name} email={picked.email} photoUrl={picked.photoUrl} size="sm" />
          <MDBox minWidth={0} flex={1} lineHeight={1.2}>
            <MDTypography variant="button" fontWeight="medium" display="block" noWrap>{picked.name || picked.email}</MDTypography>
            <MDTypography variant="caption" color="text" display="block" noWrap>{picked.email}</MDTypography>
          </MDBox>
          {!client && !editing && (
            <MDButton variant="text" color={accent} size="small" onClick={() => setPicked(null)}>Change</MDButton>
          )}
        </MDBox>
      ) : (
        <MDBox mb={3}>
          <ClientPicker onPick={(c) => { setPicked(c); setErrors((e) => ({ ...e, client: undefined })); }} />
          {errors.client && <MDTypography variant="caption" color="error" display="block" mt={0.75}>{errors.client}</MDTypography>}
        </MDBox>
      )}

      {/* What it is */}
      <MDTypography variant="button" fontWeight="bold" display="block" mb={1.5}>Holding</MDTypography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <MDInput
            select
            fullWidth
            label="Category"
            value={form.category}
            onChange={set('category')}
            SelectProps={{ displayEmpty: true, sx: { height: 44 } }}
            InputLabelProps={{ shrink: true }}
            {...err('category')}
          >
            <MenuItem value="" disabled>Choose a category…</MenuItem>
            {CATEGORY_OPTIONS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </MDInput>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Autocomplete
            freeSolo
            sx={AUTOCOMPLETE_SX}
            options={typeOptions}
            getOptionLabel={(option) => typeLabel(option)}
            inputValue={typeLabel(form.type)}
            // Typing keeps the text as typed (turned into a code like roth_ira on save); picking a suggestion stores its code.
            onInputChange={(_, value, reason) => { if (reason !== 'reset' || value) setValue('type', reason === 'reset' ? typeFromText(value) : value); }}
            onChange={(_, value) => setValue('type', typeof value === 'string' ? typeFromText(value) : '')}
            value={form.type || null}
            renderInput={(params) => (
              <MDInput {...params} fullWidth label="Type" placeholder={category === 'retirement' ? '401(k), Roth IRA…' : 'Pick or type'} InputLabelProps={{ ...params.InputLabelProps, shrink: true }} {...err('type')} />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={8}>
          <MDInput fullWidth label="Name" value={form.name} onChange={set('name')} placeholder="Fidelity 401(k), 10 oz gold bars, Bored Ape #1234…" InputLabelProps={{ shrink: true }} inputProps={{ maxLength: 120 }} {...err('name')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MDInput fullWidth label="Symbol / ticker" value={form.symbol} onChange={set('symbol')} placeholder="VTI, XAU…" InputLabelProps={{ shrink: true }} inputProps={{ maxLength: 20 }} {...err('symbol')} />
        </Grid>
        <Grid item xs={12} sm={8}>
          <MDInput fullWidth label="Institution / custodian" value={form.institution} onChange={set('institution')} placeholder="Fidelity, Vanguard, Brink's vault…" InputLabelProps={{ shrink: true }} inputProps={{ maxLength: 120 }} {...err('institution')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MDInput fullWidth label="Account last 4" value={form.accountLast4} onChange={set('accountLast4')} placeholder="1234" InputLabelProps={{ shrink: true }} inputProps={{ maxLength: 4 }} {...err('accountLast4')} />
        </Grid>
      </Grid>

      {/* Value */}
      <MDTypography variant="button" fontWeight="bold" display="block" mb={1.5}>Amount and value</MDTypography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={7} sm={4}>
          <MDInput fullWidth type="number" label="Quantity" value={form.quantity} onChange={set('quantity')} inputProps={{ step: 'any', min: 0 }} InputLabelProps={{ shrink: true }} {...err('quantity')} />
        </Grid>
        <Grid item xs={5} sm={2}>
          <Autocomplete
            freeSolo
            sx={AUTOCOMPLETE_SX}
            options={unitOptions}
            inputValue={form.unit}
            onInputChange={(_, value) => setValue('unit', value)}
            renderInput={(params) => <MDInput {...params} fullWidth label="Unit" placeholder="oz" InputLabelProps={{ ...params.InputLabelProps, shrink: true }} {...err('unit')} />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <MDInput
            fullWidth
            type="date"
            label="Valued on"
            value={form.valuedAt}
            onChange={set('valuedAt')}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: today() }}
            {...err('valuedAt')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <MDInput
            fullWidth
            type="number"
            label="Value (USD)"
            value={form.valueUsd}
            onChange={set('valueUsd')}
            inputProps={{ step: '0.01', min: 0 }}
            InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            {...err('valueUsd', 'What it is worth on the valuation date. Shown to the client.')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <MDInput
            fullWidth
            type="number"
            label="Cost basis (USD, optional)"
            value={form.costBasisUsd}
            onChange={set('costBasisUsd')}
            inputProps={{ step: '0.01', min: 0 }}
            InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            {...err('costBasisUsd', 'What was paid in total, for the gain or loss.')}
          />
        </Grid>
      </Grid>

      {/* Notes */}
      <MDTypography variant="button" fontWeight="bold" display="block" mb={1.5}>Notes</MDTypography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <MDInput fullWidth multiline minRows={3} label="Note for the client" value={form.notes} onChange={set('notes')} inputProps={{ maxLength: 1000 }} InputLabelProps={{ shrink: true }}
            placeholder="e.g. Held in an allocated vault account" {...err('notes', 'The client sees this.')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <MDInput fullWidth multiline minRows={3} label="Internal note" value={form.adminNote} onChange={set('adminNote')} inputProps={{ maxLength: 1000 }} InputLabelProps={{ shrink: true }}
            placeholder="Source of the valuation, statement date…" {...err('adminNote', 'Only DWP staff see this.')} />
        </Grid>
      </Grid>

      {failure && (
        <MDBox mt={3}>
          <MDAlert color="error">
            <MDTypography variant="button" color="white">{failure}</MDTypography>
          </MDAlert>
        </MDBox>
      )}
    </AdminDialog>
  );
}

/* ─── Client picker ─────────────────────────────────────────────────────────── */

function ClientPicker({ onPick }: { onPick: (client: HoldingClient) => void }) {
  const accent = useAccent();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientSummary[] | null>(null);

  useEffect(() => {
    let live = true;
    setResults(null);
    adminAdvisorsAPI.clients({ search: search || undefined, limit: 20 })
      .then((res) => live && setResults(res.data.clients))
      .catch(() => live && setResults([]));
    return () => { live = false; };
  }, [search]);

  return (
    <>
      <SearchField value={search} onChange={setSearch} placeholder="Search clients by name or email…" width="100%" />
      <MDBox mt={1.5} borderRadius="lg" sx={({ palette }) => ({ border: `1px solid ${palette.divider}`, maxHeight: 232, overflowY: 'auto' })}>
        {!results ? (
          <MDBox px={2} py={1}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} />)}</MDBox>
        ) : results.length === 0 ? (
          <MDBox p={3} textAlign="center">
            <Icon sx={{ color: 'text.disabled' }}>search_off</Icon>
            <MDTypography variant="button" color="text" display="block" mt={0.5}>No clients match.</MDTypography>
          </MDBox>
        ) : results.map((c, i) => (
          <MDBox key={c.id}>
            {i > 0 && <Divider sx={{ my: 0 }} />}
            <MDBox
              component="button"
              type="button"
              onClick={() => onPick({ id: c.id, name: c.name, email: c.email, photoUrl: uploadUrl(c.photo) })}
              display="flex"
              alignItems="center"
              gap={1.5}
              py={1}
              px={1.5}
              width="100%"
              textAlign="left"
              sx={({ palette, functions: { rgba } }) => ({
                border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit', font: 'inherit',
                '&:hover, &:focus-visible': { backgroundColor: rgba(palette[accent].main, 0.08), outline: 'none' },
              })}
            >
              <PersonAvatar name={c.name} email={c.email} photoUrl={uploadUrl(c.photo)} size="xs" />
              <MDBox minWidth={0} flex={1} lineHeight={1.2}>
                <MDTypography variant="button" fontWeight="medium" display="block" noWrap>{c.name || c.email}</MDTypography>
                <MDTypography variant="caption" color="text" display="block" noWrap>{c.email}{c.country ? ` · ${c.country}` : ''}</MDTypography>
              </MDBox>
              <Icon fontSize="small" sx={{ color: 'text.disabled' }}>chevron_right</Icon>
            </MDBox>
          </MDBox>
        ))}
      </MDBox>
    </>
  );
}
