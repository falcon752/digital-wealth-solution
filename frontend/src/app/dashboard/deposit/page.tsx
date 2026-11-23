'use client';

/** Deposit as a full page (direct links, ?asset=SYM). The flow itself is shared with the pop-up sheet. */
import DepositFlow from '@/components/client/flows/DepositFlow';
import { FlowPage } from '@/components/client/flows/TransferKit';

export default function DepositPage() {
  return <FlowPage flow={DepositFlow} title="Deposit" />;
}
