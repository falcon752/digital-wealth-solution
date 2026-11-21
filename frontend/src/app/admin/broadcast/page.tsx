'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import AdminPage from '@/components/admin/shell/AdminPage';
import { SearchField } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDAlert from '@/components/admin/components/MDAlert';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

type RecipientMode = 'selected' | 'all';

interface NoticeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

const LIMITS = { subject: 160, title: 120, message: 5000 } as const;

const MODES: { value: RecipientMode; label: string; help: string }[] = [
  { value: 'selected', label: 'Selected users', help: 'Only the users you tick below get it.' },
  { value: 'all', label: 'All users', help: 'Every matching platform user gets it.' },
];

const getErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
  (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
  fallback;

const counter = (length: number, limit: number) => `${length}/${limit.toLocaleString('en-US')}`;

export default function AdminBroadcastPage() {
  const accent = useAccent();
  const [users, setUsers] = useState<NoticeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('selected');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('Digital Wealth Partners account notice');
  const [title, setTitle] = useState('Account Notice');
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(() => {
    setLoading(true);
    adminAPI
      .getBroadcastUsers()
      .then((res) => setUsers(res.data.users ?? []))
      .catch(() => toast.error('Failed to load notice recipients'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadUsers, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (activeOnly && !user.isActive) return false;
      if (!q) return true;
      return `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(q);
    });
  }, [activeOnly, search, users]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id) && (!activeOnly || user.isActive)),
    [activeOnly, selectedIds, users]
  );

  const recipientCount = recipientMode === 'all'
    ? users.filter((user) => !activeOnly || user.isActive).length
    : selectedUsers.length;

  const toggleRecipient = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const selectVisible = () => {
    const visibleIds = filteredUsers.map((user) => user.id);
    setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
  };

  const clearSelection = () => setSelectedIds([]);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Enter a subject');
      return;
    }
    if (!message.trim()) {
      toast.error('Enter a message');
      return;
    }
    if (recipientCount === 0) {
      toast.error(recipientMode === 'all' ? 'No recipients found' : 'Select at least one recipient');
      return;
    }

    setSending(true);
    try {
      await adminAPI.sendBroadcast({
        recipientMode,
        userIds: recipientMode === 'selected' ? selectedIds : undefined,
        activeOnly,
        subject: subject.trim(),
        title: title.trim() || subject.trim(),
        message: message.trim(),
      });
      toast.success('Notice sent');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send notice'));
    } finally {
      setSending(false);
    }
  };

  const recipientsLabel = `recipient${recipientCount === 1 ? '' : 's'}`;
  const mode = MODES.find((m) => m.value === recipientMode);

  return (
    <AdminPage title="Account Notices" description="Send plain account notices to selected users or every client">
      <Grid container spacing={3}>
        {/* Left: the message and who gets it */}
        <Grid item xs={12} lg={8}>
          <Card>
            <MDBox p={3}>
              <MDTypography variant="h6">Compose Notice</MDTypography>
              <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={3}>
                Write a simple account notice. Paste links directly in the message body.
              </MDTypography>

              <MDBox display="flex" flexDirection="column" gap={2.5}>
                <MDInput
                  fullWidth
                  label="Subject"
                  value={subject}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                  inputProps={{ maxLength: LIMITS.subject }}
                  helperText={`The email subject line. ${counter(subject.length, LIMITS.subject)}`}
                />
                <MDInput
                  fullWidth
                  label="Header"
                  value={title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  inputProps={{ maxLength: LIMITS.title }}
                  helperText={`The heading inside the email; the subject is used when left empty. ${counter(title.length, LIMITS.title)}`}
                />
                <MDInput
                  fullWidth
                  multiline
                  minRows={12}
                  label="Message"
                  value={message}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
                  inputProps={{ maxLength: LIMITS.message }}
                  helperText={`Blank lines create paragraphs. Paste any URL directly in the message as plain text. ${counter(message.length, LIMITS.message)}`}
                />
              </MDBox>

              <Divider />
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">
                Preview
              </MDTypography>
              <MDBox
                mt={1.5}
                p={2.5}
                borderRadius="lg"
                sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}
              >
                <MDTypography variant="h5">{title || subject}</MDTypography>
                <MDTypography
                  variant="body2"
                  color="text"
                  mt={1.5}
                  component="div"
                  sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, wordBreak: 'break-word' }}
                >
                  {message || ' '}
                </MDTypography>
              </MDBox>
            </MDBox>
          </Card>

          <MDBox mt={3}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6">Recipients</MDTypography>
                <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={3}>
                  Choose all users or selected clients.
                </MDTypography>

                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} md={6}>
                    <MDInput
                      select
                      fullWidth
                      label="Send to"
                      value={recipientMode}
                      helperText={mode?.help}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setRecipientMode(e.target.value as RecipientMode)}
                      SelectProps={{ sx: { height: 44 } }}
                    >
                      {MODES.map((m) => (
                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                      ))}
                    </MDInput>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Switch checked={activeOnly} onChange={(_, checked) => setActiveOnly(checked)} />}
                      label={<MDTypography variant="button" color="text">Active users only</MDTypography>}
                    />
                  </Grid>
                </Grid>

                {recipientMode === 'selected' && (
                  <MDBox mt={2}>
                    <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                      <SearchField value={search} onChange={setSearch} placeholder="Search users" delayMs={0} width="min(320px, 100%)" />
                      <MDBox display="flex" gap={1}>
                        <MDButton variant="text" color={accent} size="small" onClick={selectVisible}>
                          Select visible
                        </MDButton>
                        <MDButton variant="text" color="secondary" size="small" onClick={clearSelection}>
                          Clear
                        </MDButton>
                      </MDBox>
                    </MDBox>

                    <MDBox
                      mt={2}
                      maxHeight={520}
                      overflow="auto"
                      borderRadius="lg"
                      sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}
                    >
                      {loading ? (
                        <MDBox p={2}>
                          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={48} />)}
                        </MDBox>
                      ) : filteredUsers.length ? (
                        filteredUsers.map((user, i) => {
                          const checked = selectedIds.includes(user.id);
                          return (
                            <MDBox key={user.id}>
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
                                <Checkbox checked={checked} onChange={() => toggleRecipient(user.id)} sx={{ p: 0.5 }} />
                                <PersonAvatar name={`${user.firstName ?? ''} ${user.lastName ?? ''}`} email={user.email} photoUrl={null} size="xs" />
                                <MDBox minWidth={0} flex={1} lineHeight={1.2}>
                                  <MDTypography variant="button" fontWeight="medium" display="block" noWrap>
                                    {user.firstName} {user.lastName}
                                  </MDTypography>
                                  <MDTypography variant="caption" color="text" display="block" noWrap>{user.email}</MDTypography>
                                </MDBox>
                                <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                              </MDBox>
                            </MDBox>
                          );
                        })
                      ) : (
                        <MDBox p={4} textAlign="center">
                          <Icon fontSize="large" sx={{ color: 'text.disabled' }}>search_off</Icon>
                          <MDTypography variant="button" color="text" display="block" mt={1}>
                            No users match this filter.
                          </MDTypography>
                        </MDBox>
                      )}
                    </MDBox>
                  </MDBox>
                )}

                {recipientMode === 'all' && (
                  <MDBox mt={2}>
                    <MDAlert color="warning">
                      <MDBox display="flex" alignItems="flex-start" gap={1.5}>
                        <Icon fontSize="small" sx={{ color: 'white.main', mt: 0.25 }}>warning</Icon>
                        <MDTypography variant="button" color="white" fontWeight="regular" display="block">
                          This notice will go to every matching platform user. Review the message carefully before sending.
                        </MDTypography>
                      </MDBox>
                    </MDAlert>
                  </MDBox>
                )}
              </MDBox>
            </Card>
          </MDBox>
        </Grid>

        {/* Right: how many get it, and send */}
        <Grid item xs={12} lg={4}>
          <MDBox position={{ lg: 'sticky' }} top={{ lg: 96 }}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" alignItems="center" gap={1} mb={1}>
                  <Icon sx={{ color: `${accent}.main` }}>groups</Icon>
                  <MDTypography variant="h6">Recipients right now</MDTypography>
                </MDBox>
                {loading ? (
                  <>
                    <Skeleton variant="text" width="40%" height={44} />
                    <Skeleton variant="text" width="70%" height={18} />
                  </>
                ) : (
                  <>
                    <MDTypography variant="h3">{recipientCount}</MDTypography>
                    <MDTypography variant="button" color="text" display="block">
                      {recipientsLabel}
                      {recipientMode === 'all' ? (activeOnly ? ', every active user' : ', every user') : ' selected'}
                    </MDTypography>
                  </>
                )}
                <MDTypography variant="caption" color="text" display="block" mt={2}>
                  {activeOnly
                    ? 'Only active accounts get it; inactive users are left out.'
                    : 'Active and inactive accounts both get it. Turn on “Active users only” to leave inactive users out.'}
                </MDTypography>
              </MDBox>
            </Card>

            <MDBox mt={3}>
              <Card>
                <MDBox p={3} display="flex" flexDirection="column" gap={1.5}>
                  <MDButton
                    variant="gradient"
                    color={accent}
                    fullWidth
                    onClick={() => void handleSend()}
                    disabled={sending || recipientCount === 0}
                  >
                    <Icon>send</Icon>&nbsp;{sending ? 'Sending…' : 'Send Notice'}
                  </MDButton>
                  <MDTypography variant="caption" color="text" textAlign="center">
                    Sending to {recipientCount} {recipientsLabel}.
                  </MDTypography>
                </MDBox>
              </Card>
            </MDBox>
          </MDBox>
        </Grid>
      </Grid>
    </AdminPage>
  );
}
