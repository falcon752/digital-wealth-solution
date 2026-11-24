'use client';

/**
 * Row actions for a holding (Edit, Close, Remove, Reopen/Restore) and the confirmation for
 * closing or removing one. Nothing is deleted: closed and removed holdings are hidden from the
 * client and from totals, and either can be made active again.
 */
import type { MouseEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import MDBox from '@/components/admin/components/MDBox';
import { errorMessage } from '@/components/admin/lib/errors';
import { adminHoldingsAPI, type Holding, type HoldingStatus } from './api';

export type StatusChange = { holding: Holding; status: Exclude<HoldingStatus, 'active'> };

export function HoldingRowActions({ holding, onEdit, onAsk, onChanged }: {
  holding: Holding;
  onEdit: (holding: Holding) => void;
  /** Close or remove: ask first. */
  onAsk: (change: StatusChange) => void;
  /** After reopening or restoring (no confirmation needed). */
  onChanged: () => void;
}) {
  const stop = (fn: () => void) => (event: MouseEvent) => { event.stopPropagation(); fn(); };
  const reactivate = async () => {
    try {
      await adminHoldingsAPI.setStatus(holding.id, 'active');
      toast.success(holding.status === 'removed' ? `${holding.name} restored` : `${holding.name} reopened`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to change the holding'));
    }
  };
  const button = (title: string, icon: string, onClick: () => void, color: 'inherit' | 'error' | 'success' | 'info' = 'inherit') => (
    <Tooltip title={title} key={title}>
      <IconButton size="small" aria-label={title} color={color} onClick={stop(onClick)}><Icon fontSize="small">{icon}</Icon></IconButton>
    </Tooltip>
  );
  return (
    <MDBox display="flex" justifyContent="flex-end" gap={0.25} whiteSpace="nowrap">
      {holding.status !== 'removed' && button('Edit', 'edit', () => onEdit(holding), 'info')}
      {holding.status === 'active' && button('Close', 'archive', () => onAsk({ holding, status: 'closed' }))}
      {holding.status === 'closed' && button('Reopen', 'unarchive', () => void reactivate(), 'success')}
      {holding.status !== 'removed' && button('Remove', 'delete', () => onAsk({ holding, status: 'removed' }), 'error')}
      {holding.status === 'removed' && button('Restore', 'restore_from_trash', () => void reactivate(), 'success')}
    </MDBox>
  );
}

export function HoldingStatusDialog({ change, onClose, onChanged }: { change: StatusChange | null; onClose: () => void; onChanged: () => void }) {
  const name = change?.holding.name ?? '';
  const removing = change?.status === 'removed';
  return (
    <ConfirmDialog
      open={Boolean(change)}
      onClose={onClose}
      title={removing ? `Remove ${name}?` : `Close ${name}?`}
      message={removing
        ? 'For a holding entered by mistake. The client no longer sees it and it leaves their totals. Nothing is deleted: you can restore it from the Removed filter.'
        : 'For a holding that was sold, rolled over or whose account was closed. The client no longer sees it and it leaves their totals. You can reopen it later.'}
      confirmLabel={removing ? 'Remove' : 'Close holding'}
      tone={removing ? 'error' : 'warning'}
      onConfirm={async () => {
        if (!change) return;
        await adminHoldingsAPI.setStatus(change.holding.id, change.status);
        toast.success(removing ? `${name} removed` : `${name} closed`);
        onChanged();
      }}
    />
  );
}
