'use client';

/** Send as a full page (direct links, ?asset=SYM). The flow itself is shared with the pop-up sheet. */
import SendFlow from '@/components/client/flows/SendFlow';
import { FlowPage } from '@/components/client/flows/TransferKit';

export default function SendAssetsPage() {
  return <FlowPage flow={SendFlow} title="Send" backHref="/dashboard/crypto" />;
}
