'use client';

/**
 * Shared pieces for the service-record details pages (/admin/kyc/<id>, /admin/llc/<id>,
 * /admin/consultations/<id>, /admin/access-requests/<id>, /admin/assets/<id>, /admin/activity/<id>):
 * the API calls (GET /api/admin/records/service/...), links between records, and a linked-person card.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import api, { apiBase } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { SectionCard } from '@/components/admin/detail/Record';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';

export type { ActivityEntry } from '@/components/admin/detail/Record';

/** A person as the API's personSummary returns them. */
export interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  isActive: boolean;
  country: string | null;
  photo: string | null;
  createdAt: string | null;
  partnerCode?: string | null;
}

/** Loads one record from /api/admin/records/service/<path>; `reload` refetches without the skeleton. */
export function useServiceRecord<T>(path: string, notFoundLabel: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await api.get(`/admin/records/service/${path}`);
      setData(response.data as T);
      setError(null);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? `${notFoundLabel} not found` : getApiError(err, `Could not load this ${notFoundLabel.toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  }, [path, notFoundLabel]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

/** Uploaded files are served by the API origin (/uploads/…). */
export function uploadSrc(value?: string | null) {
  if (!value) return null;
  return /^(https?:|blob:|data:)/.test(value) ? value : `${apiBase}${value.startsWith('/') ? '' : '/'}${value}`;
}

/** The details page for a record kind (the URL map every details page links with). */
export function recordHref(kind: string, id: string, role?: string | null) {
  switch (kind) {
    case 'user': return role === 'advisor' ? `/admin/advisors/${id}` : `/admin/users/${id}`;
    case 'advisor': return `/admin/advisors/${id}`;
    case 'support': return `/admin/support/${id}`;
    case 'deposit': return `/admin/deposits/${id}`;
    case 'withdrawal': return `/admin/withdrawals/${id}`;
    case 'loan': return `/admin/loans/${id}`;
    case 'earn': return `/admin/loans/${id}?kind=earn`;
    case 'card': return `/admin/cards/${id}`;
    case 'payment-proof': return `/admin/payment-proofs/${id}`;
    case 'onboarding-payment': return `/admin/onboarding-payments/${id}`;
    case 'commission': return `/admin/referrals/${id}`;
    case 'kyc': return `/admin/kyc/${id}`;
    case 'llc': return `/admin/llc/${id}`;
    case 'consultation': return `/admin/consultations/${id}`;
    case 'access-request': return `/admin/access-requests/${id}`;
    case 'asset': return `/admin/assets/${id}`;
    case 'activity': return `/admin/activity/${id}`;
    default: return null;
  }
}

export const personHref = (person: Pick<Person, 'id' | 'role'>) => recordHref('user', person.id, person.role) as string;

export function fileIcon(mimeType?: string | null) {
  if (mimeType === 'application/pdf') return 'picture_as_pdf';
  if (mimeType?.startsWith('image/')) return 'image';
  return 'description';
}

export function fileSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** A linked person (the client, a partner, a reviewer): avatar, contact details and a link to their page. */
export function PersonCard({ title, person, note, empty = 'No linked account.', children }: {
  title: ReactNode;
  person: Person | null | undefined;
  note?: ReactNode;
  empty?: ReactNode;
  children?: ReactNode;
}) {
  if (!person) {
    return (
      <SectionCard title={title}>
        <MDTypography variant="button" color="text" component="div">{empty}</MDTypography>
        {children}
      </SectionCard>
    );
  }
  const href = personHref(person);
  return (
    <SectionCard
      title={title}
      action={
        <MDButton component={Link} href={href} variant="text" color="info" size="small" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          Open&nbsp;<Icon fontSize="small">arrow_forward</Icon>
        </MDButton>
      }
    >
      <MDBox
        component={Link}
        href={href}
        display="flex"
        alignItems="center"
        gap={1.5}
        mb={2}
        sx={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}
      >
        <PersonAvatar name={person.name} email={person.email} photoUrl={uploadSrc(person.photo)} size="md" />
        <MDBox minWidth={0} lineHeight={1.25}>
          <MDTypography variant="button" fontWeight="bold" display="block" sx={{ wordBreak: 'break-word' }}>
            {person.name || person.email || 'Unnamed'}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block" sx={{ wordBreak: 'break-all' }}>{person.email}</MDTypography>
        </MDBox>
      </MDBox>
      <MDBox display="flex" gap={1} flexWrap="wrap" mb={2}>
        {person.role && <StatusBadge status={person.role === 'user' ? 'client' : person.role} label={person.role === 'user' ? 'Client' : humanize(person.role)} />}
        <StatusBadge status={person.isActive ? 'active' : 'inactive'} />
      </MDBox>
      <DetailGrid items={[
        { label: 'Phone', value: person.phone, span: 6 },
        { label: 'Country', value: person.country, span: 6 },
        ...(person.partnerCode !== undefined ? [{ label: 'Partner code', value: person.partnerCode, span: 6 as const }] : []),
        { label: 'Joined', value: person.createdAt ? new Date(person.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : null, span: 6 },
      ]} />
      {note && <MDTypography variant="caption" color="text" component="div" mt={2}>{note}</MDTypography>}
      {children}
    </SectionCard>
  );
}

/** A long free-text answer with its label (messages, reasons, notes). */
export function TextBlock({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <MDBox>
      <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">{label}</MDTypography>
      <MDTypography variant="button" color="text" fontWeight="regular" component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {children || '—'}
      </MDTypography>
    </MDBox>
  );
}
