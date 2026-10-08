'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import { adminAPI } from '@/lib/api';
import {
  Check,
  Search,
  Send,
  Users,
} from 'lucide-react';
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

const getErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
  (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
  fallback;

export default function AdminBroadcastPage() {
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

  return (
    <div className="flex min-h-full flex-col bg-[#f9f9fb] dark:bg-[#050505]">
      <DashboardHeader title="Account Notices" subtitle="Send plain account notices to selected users or every client" logo="dwp" />

      <div className="flex-1 space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#101010]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Compose Notice</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Write a simple account notice. Paste links directly in the message body.</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={160}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-gray-800 dark:bg-[#0b0b0b] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Header</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-gray-800 dark:bg-[#0b0b0b] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  maxLength={5000}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-gray-800 dark:bg-[#0b0b0b] dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Blank lines create paragraphs. Paste any URL directly in the message as plain text.</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#0b0b0b]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Preview</p>
                <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{title || subject}</h3>
                <div className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">{message}</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#101010]">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recipients</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose all users or selected clients.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-[#0b0b0b]">
              {(['selected', 'all'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRecipientMode(mode)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                    recipientMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Active users only
            </label>

            {recipientMode === 'selected' && (
              <>
                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search users"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-blue-400 dark:border-gray-800 dark:bg-[#0b0b0b] dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <button type="button" onClick={selectVisible} className="font-semibold text-blue-600 hover:text-blue-500">
                    Select visible
                  </button>
                  <button type="button" onClick={clearSelection} className="font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Clear
                  </button>
                </div>

                <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : filteredUsers.length ? (
                    filteredUsers.map((user) => {
                      const checked = selectedIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleRecipient(user.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                            checked
                              ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                              : 'border-gray-200 bg-white hover:border-blue-200 dark:border-gray-800 dark:bg-[#151515]'
                          }`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'
                          }`}>
                            {checked && <Check size={13} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            user.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
                      No users match this filter.
                    </div>
                  )}
                </div>
              </>
            )}

            {recipientMode === 'all' && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-300">
                This notice will go to every matching platform user. Review the message carefully before sending.
              </div>
            )}

            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-800">
              <Button onClick={handleSend} loading={sending} disabled={sending || recipientCount === 0} className="w-full">
                <Send size={16} />
                Send Notice
              </Button>
              <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                Sending to {recipientCount} recipient{recipientCount === 1 ? '' : 's'}.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
