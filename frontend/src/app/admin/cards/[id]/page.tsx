'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import { NotesCard, PersonCard, fullName, useAdminRecord, type ActivityEntry, type PersonInfo, filled } from '@/components/admin/money/MoneyKit';

interface CardRow { id: string; cardHolderName: string; cardNumber: string; cardType: string; status: string; createdAt: string }

interface CardRecord {
  card: CardRow & { userId: string; adminNote: string | null; updatedAt: string; feeUsd: number | null };
  user: PersonInfo | null;
  related: { cards: CardRow[] };
  activity: ActivityEntry[];
}

type Action = 'approved' | 'rejected' | 'delete';

export default function AdminCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminRecord<CardRecord>(`cards/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/cards" backLabel="Back to cards">
      {data && <CardView data={data} reload={reload} />}
    </RecordState>
  );
}

function CardView({ data, reload }: { data: CardRecord; reload: () => Promise<void> }) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const { card: c, user, related, activity } = data;
  const disabledEntry = activity.find((a) => a.action === 'Card Disabled');

  const events: TimelineEvent[] = [
    { label: 'Applied', at: c.createdAt, tone: 'info', note: c.feeUsd ? `${fmtUsd(c.feeUsd)} card fee taken from the balance` : undefined },
    c.status === 'pending'
      ? { label: 'Approved', pending: true, note: 'Waiting for review.' }
      : c.status === 'approved'
        ? { label: 'Approved', at: c.updatedAt, tone: 'success' }
        : c.status === 'disabled'
          ? { label: 'Disabled by the client', at: disabledEntry?.createdAt ?? c.updatedAt, tone: 'dark' }
          : { label: 'Rejected', at: c.updatedAt, tone: 'error', note: c.adminNote || undefined },
  ];

  const run = async (note: string) => {
    if (action === 'delete') {
      await api.delete(`/admin/cards/${c.id}`);
      toast.success('Card application deleted');
      router.push('/admin/cards');
      return;
    }
    await api.put(`/admin/cards/${c.id}`, { status: action, adminNote: note || null });
    toast.success(action === 'approved' ? 'Card approved' : 'Card rejected');
    await reload();
  };

  return (
    <AdminPage
      actions={
        <>
          <MDButton component={Link} href="/admin/cards" variant="outlined" color="dark" size="small">
            <Icon>arrow_back</Icon>&nbsp;Cards
          </MDButton>
          <MDButton variant="text" color="error" size="small" onClick={() => setAction('delete')}>
            <Icon>delete</Icon>&nbsp;Delete
          </MDButton>
          {c.status === 'pending' && (
            <>
              <MDButton variant="outlined" color="error" size="small" onClick={() => setAction('rejected')}>
                <Icon>cancel</Icon>&nbsp;Reject
              </MDButton>
              <MDButton variant="gradient" color="success" size="small" onClick={() => setAction('approved')}>
                <Icon>check_circle</Icon>&nbsp;Approve
              </MDButton>
            </>
          )}
        </>
      }
    >
      <RecordHeader
        icon="payment"
        title={`Card · ${c.cardType}`}
        subtitle={<>{fullName(user)} · applied {fmtDateTime(c.createdAt)}</>}
        badges={[{ status: c.status }]}
        items={filled([
          { label: 'Card holder', value: c.cardHolderName },
          { label: 'Card number', value: <Mono value={c.cardNumber} short={false} /> },
          { label: 'Type', value: c.cardType },
          { label: 'Card fee', value: fmtUsd(c.feeUsd) },
          { label: 'Client', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : null },
          { label: 'Applied', value: fmtDateTime(c.createdAt) },
          { label: 'Last updated', value: fmtDateTime(c.updatedAt) },
          { label: 'Record ID', value: <Mono value={c.id} short={false} /> },
        ])}
      />

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard person={user} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Card">
            <MDBox
              borderRadius="xl"
              p={2.5}
              color="white"
              sx={{ background: 'linear-gradient(135deg, #1a2a6c 0%, #2a4d9b 55%, #3b6fd1 100%)', aspectRatio: '1.586', maxWidth: 340, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <MDBox display="flex" justifyContent="space-between" alignItems="center">
                <MDTypography variant="button" color="white" fontWeight="bold">{c.cardType}</MDTypography>
                <StatusBadge status={c.status} />
              </MDBox>
              <MDTypography variant="h6" color="white" sx={{ fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.08em' }}>{c.cardNumber}</MDTypography>
              <MDTypography variant="caption" color="white" fontWeight="medium" textTransform="uppercase">{c.cardHolderName}</MDTypography>
            </MDBox>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={events} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <NotesCard notes={[{ label: 'Admin note', text: c.adminNote }]} />
        </Grid>
        <Grid item xs={12} lg={8}>
          <RelatedTable
            title={`${user?.firstName || 'The client'}'s other card applications`}
            rows={related.cards}
            getKey={(r) => r.id}
            rowHref={(r) => `/admin/cards/${r.id}`}
            empty="No other card applications."
            columns={[
              { label: 'Type', render: (r) => <b>{r.cardType}</b> },
              { label: 'Number', hideOnMobile: true, render: (r) => <Mono value={r.cardNumber} short={false} /> },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Date', render: (r) => fmtDate(r.createdAt) },
            ]}
          />
        </Grid>
        <Grid item xs={12}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      {action && (
        <ConfirmDialog
          open
          title={action === 'delete' ? 'Delete this card application?' : action === 'approved' ? 'Approve this card?' : 'Reject this card?'}
          tone={action === 'approved' ? 'success' : 'error'}
          confirmLabel={action === 'delete' ? 'Delete' : action === 'approved' ? 'Approve' : 'Reject'}
          message={
            action === 'delete'
              ? <>The application is removed completely. The {c.feeUsd ? fmtUsd(c.feeUsd) : 'card'} fee is not refunded. This can&apos;t be undone.</>
              : action === 'approved'
                ? <>{fullName(user)}&apos;s {c.cardType} card is marked approved.</>
                : <>{fullName(user)}&apos;s application is marked rejected. The card fee is not refunded automatically.</>
          }
          reason={action === 'delete' ? undefined : { label: 'Admin note (optional)', required: false, maxLength: 500 }}
          onConfirm={run}
          onClose={() => setAction(null)}
        />
      )}
    </AdminPage>
  );
}
