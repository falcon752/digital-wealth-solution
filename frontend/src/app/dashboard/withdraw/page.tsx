'use client';

/** Withdraw as a full page (direct links, ?asset=SYM). The flow itself is shared with the pop-up sheet. */
import WithdrawFlow from '@/components/client/flows/WithdrawFlow';
import { FlowPage } from '@/components/client/flows/TransferKit';

export default function WithdrawPage() {
  return <FlowPage flow={WithdrawFlow} title="Withdraw" />;
}
