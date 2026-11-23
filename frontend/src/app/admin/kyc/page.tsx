'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react';
import AppBar from '@mui/material/AppBar';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import { kycAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { KYCRelatedPerson, KYCRequirement, KYCSubmission } from '@/types';
import { APP_TIMEZONE } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import { SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDAlert from '@/components/admin/components/MDAlert';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

type SensitiveData = { taxIdentifier: string | null; businessEin: string | null };
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
type StatusOption = Exclude<StatusFilter, 'all'>;
const FILTERS: { key: StatusOption; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];
const APPLIES_TO: { value: KYCRequirement['appliesTo']; label: string }[] = [
  { value: 'all', label: 'All applicants' },
  { value: 'individual', label: 'Individuals only' },
  { value: 'business', label: 'Businesses only' },
];

type Input = ChangeEvent<HTMLInputElement>;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE, dateStyle: 'medium' }) : '-';
}

function applicant(submission: KYCSubmission) {
  if (typeof submission.userId === 'string') {
    return { firstName: submission.legalFirstName, lastName: submission.legalLastName, email: submission.emailAddress || '' };
  }
  return submission.userId;
}

/** A small rounded icon tile, as on the Overview's queue list. */
function IconTile({ icon, color }: { icon: string; color: 'info' | 'success' | 'error' | 'dark' | 'primary' | 'warning' }) {
  return (
    <MDBox display="grid" sx={{ placeItems: 'center', flexShrink: 0 }} width="2.25rem" height="2.25rem" borderRadius="md" variant="gradient" bgColor={color} color="white">
      <Icon fontSize="small">{icon}</Icon>
    </MDBox>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <MDTypography variant="h6" fontWeight="medium" mb={1.5}>{children}</MDTypography>;
}

function PeopleList({ title, people, showOwnership = false }: { title: string; people?: KYCRelatedPerson[]; showOwnership?: boolean }) {
  if (!people?.length) return null;
  return (
    <MDBox mt={3}>
      <SectionTitle>{title}</SectionTitle>
      {people.map((person, index) => (
        <MDBox key={`${person.fullName}-${index}`}>
          {index > 0 && <Divider sx={{ my: 0 }} />}
          <MDBox display="flex" alignItems="center" gap={2} py={1.25} flexWrap="wrap">
            <MDBox flex="1 1 160px" minWidth={0} lineHeight={1.2}>
              <MDTypography variant="button" fontWeight="medium" display="block">{person.fullName}</MDTypography>
              <MDTypography variant="caption" color="text">{person.title || 'No title provided'}</MDTypography>
            </MDBox>
            <MDTypography variant="button" color="text" fontWeight="regular" flex="1 1 160px" sx={{ wordBreak: 'break-all' }}>
              {person.email || 'No email provided'}
            </MDTypography>
            {showOwnership && <MDTypography variant="button" fontWeight="bold">{person.ownershipPercentage}%</MDTypography>}
          </MDBox>
        </MDBox>
      ))}
    </MDBox>
  );
}

export default function AdminKYCPage() {
  const accent = useAccent();
  const [tab, setTab] = useState<'submissions' | 'requirements'>('submissions');
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [requirements, setRequirements] = useState<KYCRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<KYCSubmission | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [changingDecision, setChangingDecision] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<SensitiveData | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    name: '', description: '', required: true, appliesTo: 'all' as KYCRequirement['appliesTo'],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [submissionsResponse, requirementsResponse] = await Promise.all([
        kycAPI.adminSubmissions(),
        kycAPI.getRequirements(),
      ]);
      const loaded: KYCSubmission[] = submissionsResponse.data.submissions;
      setSubmissions(loaded);
      // Open on the review queue when something is waiting, otherwise show everything.
      setFilter(loaded.some((item) => item.status === 'pending') ? 'pending' : 'all');
      setRequirements(requirementsResponse.data.requirements);
    } catch {
      toast.error('Failed to load KYC administration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openReview = (submission: KYCSubmission) => {
    setReviewing(submission);
    setRejectionReason(submission.rejectionReason || '');
    setSensitiveData(null);
    setChangingDecision(false);
  };

  const closeReview = () => {
    setReviewing(null);
    setRejectionReason('');
    setSensitiveData(null);
  };

  const revealSensitiveData = async () => {
    if (!reviewing) return;
    if (sensitiveData) {
      setSensitiveData(null);
      return;
    }
    setRevealing(true);
    try {
      const response = await kycAPI.adminSensitiveData(reviewing.id);
      setSensitiveData(response.data);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to reveal protected identifiers'));
    } finally {
      setRevealing(false);
    }
  };

  const openDocument = async (submissionId: string, documentId: string) => {
    try {
      const response = await kycAPI.getDocument(submissionId, documentId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Unable to open this document');
    }
  };

  const review = async (status: 'approved' | 'rejected') => {
    if (!reviewing) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Enter a reason so the user knows what to correct');
      return;
    }
    setSaving(true);
    try {
      const response = await kycAPI.adminReview(reviewing.id, { status, rejectionReason: rejectionReason.trim() || undefined });
      setSubmissions((current) => current.map((item) => item.id === reviewing.id ? response.data.submission : item));
      closeReview();
      toast.success(response.data.message || `Verification ${status}`);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to review verification'));
    } finally {
      setSaving(false);
    }
  };

  const addRequirement = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await kycAPI.createRequirement({ ...newRequirement, sortOrder: requirements.length * 10 + 10 });
      setRequirements((current) => [...current, response.data.requirement]);
      setNewRequirement({ name: '', description: '', required: true, appliesTo: 'all' });
      toast.success('Document requirement added');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to add requirement'));
    }
  };

  const changeRequirement = (id: string, change: Partial<KYCRequirement>) => {
    setRequirements((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
  };

  const updateRequirement = async (requirement: KYCRequirement) => {
    try {
      const response = await kycAPI.updateRequirement(requirement.id, {
        name: requirement.name,
        description: requirement.description || '',
        required: requirement.required,
        active: requirement.active,
        appliesTo: requirement.appliesTo,
        sortOrder: requirement.sortOrder,
      });
      setRequirements((current) => current.map((item) => item.id === requirement.id ? response.data.requirement : item));
      toast.success('Requirement updated');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to update requirement'));
    }
  };

  const countFor = (key: StatusFilter) => key === 'all' ? submissions.length : submissions.filter((item) => item.status === key).length;
  const visibleSubmissions = filter === 'all' ? submissions : submissions.filter((item) => item.status === filter);
  const decided = reviewing ? reviewing.status === 'approved' || reviewing.status === 'rejected' : false;
  const showDecisionButtons = !decided || changingDecision;

  const columns: Column<KYCSubmission>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (submission) => {
        const user = applicant(submission);
        return (
          <MDBox display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <PersonAvatar name={`${user.firstName} ${user.lastName}`} email={user.email} photoUrl={null} />
            <MDBox lineHeight={1.2} minWidth={0}>
              <MDTypography variant="button" fontWeight="medium" display="block">{user.firstName} {user.lastName}</MDTypography>
              <MDTypography variant="caption" color="text" display="block" sx={{ wordBreak: 'break-all' }}>{user.email}</MDTypography>
              {/* Phones: the status here, since its column is hidden. */}
              <MDBox display={{ xs: 'block', md: 'none' }} mt={0.5}><StatusBadge status={submission.status} /></MDBox>
            </MDBox>
          </MDBox>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      hideOnMobile: true,
      render: (submission) => (
        <MDBox display="flex" alignItems="center" gap={0.75} textTransform="capitalize">
          <Icon fontSize="small">{submission.applicantType === 'business' ? 'business' : 'person'}</Icon>
          {submission.applicantType}
        </MDBox>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      hideOnMobile: true,
      render: (submission) => submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE }) : '-',
    },
    { key: 'documents', header: 'Documents', hideOnMobile: true, align: 'center', render: (submission) => submission.documents.length },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (submission) => (
        <MDBox lineHeight={1.2}>
          <StatusBadge status={submission.status} />
          {submission.status !== 'pending' && submission.reviewedAt && (
            <MDTypography variant="caption" color="text" display="block" mt={0.5}>{formatDate(submission.reviewedAt)}</MDTypography>
          )}
        </MDBox>
      ),
    },
    {
      key: 'review',
      header: 'Review',
      align: 'right',
      render: (submission) => (
        <Tooltip title="Review verification">
          <IconButton size="small" aria-label="Review verification" onClick={(event) => { event.stopPropagation(); openReview(submission); }}>
            <Icon>visibility</Icon>
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const statCards: { key: StatusOption; title: string; icon: string; color: 'warning' | 'success' | 'error' }[] = [
    { key: 'pending', title: 'Waiting for review', icon: 'pending_actions', color: 'warning' },
    { key: 'approved', title: 'Approved', icon: 'verified_user', color: 'success' },
    { key: 'rejected', title: 'Rejected', icon: 'block', color: 'error' },
  ];

  return (
    <AdminPage title="KYC Verification" description="Review identity submissions and manage required documents">
      <MDBox maxWidth={480} mb={5}>
        <AppBar position="static">
          <Tabs value={tab} onChange={(_: SyntheticEvent, value: 'submissions' | 'requirements') => setTab(value)}>
            <Tab value="submissions" label="Submissions" icon={<Icon fontSize="small" sx={{ mt: -0.25 }}>verified_user</Icon>} iconPosition="start" />
            <Tab value="requirements" label="Requirements" icon={<Icon fontSize="small" sx={{ mt: -0.25 }}>tune</Icon>} iconPosition="start" />
          </Tabs>
        </AppBar>
      </MDBox>

      {tab === 'submissions' ? (
        <>
          <Grid container spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {statCards.map((card) => (
              <Grid item xs={12} md={4} key={card.key}>
                <MDBox
                  mb={1.5}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFilter(card.key)}
                  onKeyDown={(event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') setFilter(card.key); }}
                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.92 } }}
                >
                  <StatCard
                    loading={loading}
                    color={card.color}
                    icon={card.icon}
                    title={card.title}
                    value={countFor(card.key)}
                    footnote={{ label: filter === card.key ? 'Shown below' : 'Click to show these', color: filter === card.key ? card.color : 'secondary' }}
                  />
                </MDBox>
              </Grid>
            ))}
          </Grid>

          <MDBox mt={{ xs: 2, md: 4.5 }}>
            <DataTableCard
              title="Verification submissions"
              subtitle={filter === 'pending' ? 'Waiting for review' : filter === 'all' ? 'Every submission' : `${FILTERS.find((f) => f.key === filter)?.label} verifications`}
              columns={columns}
              rows={visibleSubmissions}
              rowKey={(submission) => submission.id}
              rowHref={(submission) => `/admin/kyc/${submission.id}`}
              isLoading={loading}
              emptyMessage={submissions.length ? (filter === 'pending' ? 'Nothing is waiting for review.' : `No ${filter} verifications.`) : 'No verification submissions yet.'}
              toolbar={
                <SelectFilter<StatusOption>
                  label="Status"
                  value={filter === 'all' ? '' : filter}
                  options={FILTERS.map(({ key, label }) => ({ value: key, label: `${label} (${countFor(key)})` }))}
                  anyLabel={`All (${countFor('all')})`}
                  onChange={(value) => setFilter(value || 'all')}
                  width={200}
                />
              }
            />
          </MDBox>
        </>
      ) : (
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} lg={8}>
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} sx={{ mb: 2 }}><MDBox p={3}><Skeleton height={40} /><Skeleton height={40} /><Skeleton width="40%" /></MDBox></Card>
            ))}
            {!loading && requirements.map((requirement) => (
              <Card key={requirement.id} sx={{ mb: 2 }}>
                <MDBox p={3} display="flex" alignItems="flex-start" gap={2}>
                  <IconTile icon="description" color={accent} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <MDInput
                        label="Document type"
                        value={requirement.name}
                        onChange={(event: Input) => changeRequirement(requirement.id, { name: event.target.value })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <MDInput
                        select
                        label="Applies to"
                        value={requirement.appliesTo || 'all'}
                        onChange={(event: Input) => changeRequirement(requirement.id, { appliesTo: event.target.value as KYCRequirement['appliesTo'] })}
                        SelectProps={{ sx: { height: 44 } }}
                        fullWidth
                      >
                        {APPLIES_TO.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                      </MDInput>
                    </Grid>
                    <Grid item xs={12}>
                      <MDInput
                        label="Description"
                        value={requirement.description || ''}
                        onChange={(event: Input) => changeRequirement(requirement.id, { description: event.target.value })}
                        placeholder="Description"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <MDBox display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                        <FormControlLabel
                          control={<Checkbox checked={requirement.required} onChange={(event: Input) => changeRequirement(requirement.id, { required: event.target.checked })} />}
                          label={<MDTypography variant="button" color="text" fontWeight="regular">Required</MDTypography>}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={requirement.active} onChange={(event: Input) => changeRequirement(requirement.id, { active: event.target.checked })} />}
                          label={<MDTypography variant="button" color="text" fontWeight="regular">Active</MDTypography>}
                        />
                        <MDBox ml="auto">
                          <MDButton variant="gradient" color={accent} size="small" onClick={() => updateRequirement(requirement)}>
                            <Icon>save</Icon>&nbsp;Save
                          </MDButton>
                        </MDBox>
                      </MDBox>
                    </Grid>
                  </Grid>
                </MDBox>
              </Card>
            ))}
            {!loading && !requirements.length && (
              <Card><MDBox p={4} textAlign="center"><MDTypography variant="button" color="text">No document requirements yet. Add the first one.</MDTypography></MDBox></Card>
            )}
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card component="form" onSubmit={addRequirement} sx={{ position: { lg: 'sticky' }, top: { lg: 96 } }}>
              <MDBox p={3}>
                <MDTypography variant="h6" fontWeight="medium">Add requirement</MDTypography>
                <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={3}>
                  Create a document type and choose who must provide it.
                </MDTypography>
                <MDBox mb={2}>
                  <MDInput
                    required
                    label="Document type"
                    value={newRequirement.name}
                    onChange={(event: Input) => setNewRequirement((current) => ({ ...current, name: event.target.value }))}
                    fullWidth
                  />
                </MDBox>
                <MDBox mb={2}>
                  <MDInput
                    select
                    label="Applies to"
                    value={newRequirement.appliesTo}
                    onChange={(event: Input) => setNewRequirement((current) => ({ ...current, appliesTo: event.target.value as KYCRequirement['appliesTo'] }))}
                    SelectProps={{ sx: { height: 44 } }}
                    fullWidth
                  >
                    {APPLIES_TO.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </MDInput>
                </MDBox>
                <MDBox mb={1}>
                  <MDInput
                    label="Description or instructions"
                    multiline
                    minRows={3}
                    value={newRequirement.description}
                    onChange={(event: Input) => setNewRequirement((current) => ({ ...current, description: event.target.value }))}
                    fullWidth
                  />
                </MDBox>
                <FormControlLabel
                  control={<Checkbox checked={newRequirement.required} onChange={(event: Input) => setNewRequirement((current) => ({ ...current, required: event.target.checked }))} />}
                  label={<MDTypography variant="button" color="text" fontWeight="regular">Required document</MDTypography>}
                />
                <MDBox mt={2}>
                  <MDButton type="submit" variant="gradient" color={accent} fullWidth>
                    <Icon>add</Icon>&nbsp;Add Requirement
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      )}

      <AdminDialog
        isOpen={!!reviewing}
        onClose={closeReview}
        title="Review KYC Verification"
        size="lg"
        actions={reviewing && (showDecisionButtons ? (
          <>
            <MDButton variant="text" color="dark" onClick={closeReview} disabled={saving}>Cancel</MDButton>
            {reviewing.status !== 'rejected' && (
              <MDButton variant="outlined" color="error" disabled={saving} onClick={() => review('rejected')}>
                <Icon>close</Icon>&nbsp;Reject
              </MDButton>
            )}
            {reviewing.status !== 'approved' && (
              <MDButton variant="gradient" color="success" disabled={saving} onClick={() => review('approved')}>
                <Icon>check</Icon>&nbsp;{saving ? 'Saving…' : 'Approve'}
              </MDButton>
            )}
          </>
        ) : (
          <MDButton variant="text" color="dark" onClick={closeReview}>Close</MDButton>
        ))}
      >
        {reviewing && (
          <>
            <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" mb={3}>
              <MDBox display="flex" alignItems="center" gap={1.5} minWidth={0}>
                <IconTile icon={reviewing.applicantType === 'business' ? 'business' : 'person'} color={accent} />
                <MDBox lineHeight={1.2}>
                  <MDTypography variant="button" fontWeight="bold" display="block" textTransform="capitalize">{reviewing.applicantType} application</MDTypography>
                  <MDTypography variant="caption" color="text">Sensitive identifier access is recorded in the activity log.</MDTypography>
                </MDBox>
              </MDBox>
              <MDButton variant="outlined" color="dark" size="small" disabled={revealing} onClick={revealSensitiveData}>
                <Icon>{sensitiveData ? 'visibility_off' : 'visibility'}</Icon>&nbsp;{sensitiveData ? 'Hide IDs' : revealing ? 'Loading' : 'Reveal IDs'}
              </MDButton>
            </MDBox>

            <SectionTitle>Applicant information</SectionTitle>
            <DetailGrid items={[
              { label: 'Legal name', value: `${reviewing.legalFirstName} ${reviewing.legalLastName}`, span: 6 },
              { label: 'Date of birth', value: new Date(reviewing.dateOfBirth).toLocaleDateString('en-US', { timeZone: 'UTC' }), span: 6 },
              { label: 'Email', value: reviewing.emailAddress, span: 6 },
              { label: 'Phone', value: reviewing.phoneNumber, span: 6 },
              { label: 'Country', value: reviewing.country, span: 6 },
              { label: 'Residential address', value: reviewing.residentialAddress, span: 6 },
              { label: 'Tax classification', value: reviewing.taxClassification, span: 6 },
              { label: 'Tax identifier', value: sensitiveData?.taxIdentifier || (reviewing.taxIdentifierLast4 ? `Ending in ${reviewing.taxIdentifierLast4}` : null), span: 6 },
            ]} />

            {reviewing.applicantType === 'business' && (
              <>
                <Divider sx={{ my: 3 }} />
                <SectionTitle>Entity information</SectionTitle>
                <DetailGrid items={[
                  { label: 'Legal entity name', value: reviewing.legalEntityName, span: 6 },
                  { label: 'Entity type', value: reviewing.entityType, span: 6 },
                  { label: 'EIN / FEIN', value: sensitiveData?.businessEin || (reviewing.businessEinLast4 ? `Ending in ${reviewing.businessEinLast4}` : null), span: 6 },
                  { label: 'Formation jurisdiction', value: reviewing.formationJurisdiction, span: 6 },
                  { label: 'Principal address', value: reviewing.principalAddress, span: 6 },
                  { label: 'Business description', value: reviewing.businessDescription, span: 6 },
                  { label: 'Affiliated entities', value: reviewing.affiliatedEntities, span: 6 },
                  { label: 'KYC / AML program', value: reviewing.kycAmlProgramDetails, span: 6 },
                  { label: 'Financial history', value: reviewing.financialHistorySummary, span: 12 },
                ]} />
                <PeopleList title="Beneficial owners" people={reviewing.beneficialOwners} showOwnership />
                <PeopleList title="Authorized representatives" people={reviewing.authorizedRepresentatives} />
              </>
            )}

            <Divider sx={{ my: 3 }} />
            <SectionTitle>Documents</SectionTitle>
            {reviewing.documents.map((document, index) => (
              <MDBox key={document.id}>
                {index > 0 && <Divider sx={{ my: 0 }} />}
                <MDBox
                  component="button"
                  type="button"
                  onClick={() => openDocument(reviewing.id, document.id)}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1.5}
                  width="100%"
                  py={1.25}
                  px={1}
                  borderRadius="md"
                  sx={({ palette }) => ({
                    border: 0,
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    '&:hover': { backgroundColor: palette.action.hover },
                  })}
                >
                  <MDBox display="flex" alignItems="center" gap={1.5} minWidth={0}>
                    <Icon color="info">{document.mimeType === 'application/pdf' ? 'picture_as_pdf' : document.mimeType?.startsWith('image/') ? 'image' : 'description'}</Icon>
                    <MDTypography variant="button" fontWeight="medium" noWrap>{document.requirementName}: {document.originalName}</MDTypography>
                  </MDBox>
                  <Icon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }}>open_in_new</Icon>
                </MDBox>
              </MDBox>
            ))}
            {!reviewing.documents.length && <MDTypography variant="button" color="text">No documents were uploaded.</MDTypography>}

            {decided && (
              <MDAlert color={reviewing.status === 'approved' ? 'success' : 'error'} mt={3} mb={0} sx={{ '& > div:first-of-type': { flex: 1 } }}>
                <MDBox display="flex" alignItems="flex-start" gap={1.5} width="100%" flexWrap="wrap">
                  <Icon sx={{ mt: 0.25, flexShrink: 0 }}>{reviewing.status === 'approved' ? 'check_circle' : 'cancel'}</Icon>
                  <MDBox flex="1 1 240px" minWidth={0}>
                    <MDTypography variant="button" color="white" fontWeight="bold" display="block">
                      {reviewing.status === 'approved' ? 'Approved' : 'Rejected'} on {formatDate(reviewing.reviewedAt)}
                    </MDTypography>
                    <MDTypography variant="button" color="white" fontWeight="regular" display="block" opacity={0.9}>
                      {reviewing.status === 'approved' ? 'The client was sent their welcome email.' : 'The client was emailed your reason and can resubmit.'}
                    </MDTypography>
                    {reviewing.status === 'rejected' && reviewing.rejectionReason && (
                      <MDTypography variant="button" color="white" fontWeight="regular" display="block" mt={1} whiteSpace="pre-line">
                        {reviewing.rejectionReason}
                      </MDTypography>
                    )}
                  </MDBox>
                  {!changingDecision && (
                    <MDButton variant="outlined" color="white" size="small" onClick={() => setChangingDecision(true)}>
                      Change decision
                    </MDButton>
                  )}
                </MDBox>
              </MDAlert>
            )}

            {showDecisionButtons && (
              <MDBox mt={3}>
                {reviewing.status !== 'rejected' && (
                  <MDInput
                    label="Rejection reason"
                    multiline
                    minRows={4}
                    value={rejectionReason}
                    onChange={(event: Input) => setRejectionReason(event.target.value)}
                    placeholder="Required when rejecting. The client sees this in their email."
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                )}
                <MDTypography variant="caption" color="text" display="block" mt={1.5}>
                  Approving emails the client a welcome email. Rejecting emails them your reason so they can correct it.
                </MDTypography>
              </MDBox>
            )}
          </>
        )}
      </AdminDialog>
    </AdminPage>
  );
}
