'use client';

/**
 * The Buy page, for direct links (/dashboard/buy?asset=BTC). The flow itself lives in
 * components/client/flows/BuyFlow and is the same one the dashboard opens as a pop-up sheet.
 */
import { use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions } from '@/components/client/actions';
import { Card, PageHeader, Tabs } from '@/components/client/ui';
import BuyFlow from '@/components/client/flows/BuyFlow';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Convert and Buy share the Trade section; these tabs move between them. */
function TradeTabs({ value }: { value: 'swap' | 'buy' }) {
  const router = useRouter();
  return (
    <Tabs
      className="mt-6"
      tabs={[{ value: 'swap', label: 'Convert' }, { value: 'buy', label: 'Buy' }]}
      value={value}
      onChange={(next) => { if (next !== value) router.push(`/dashboard/${next}`); }}
    />
  );
}

export default function BuyCryptoPage({ searchParams }: { searchParams: SearchParams }) {
  const query = use(searchParams);
  const router = useRouter();
  const { openAction } = useActions();
  const close = useCallback(() => router.push('/dashboard'), [router]);
  const setHeader = useCallback(() => {}, []);

  return (
    <div className="min-h-full">
      <DashboardHeader title="Buy" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <PageHeader icon={Zap} title="Buy crypto" titleOnPhone={false} meta={['Pay by card or bank through a trusted provider']} />
          <TradeTabs value="buy" />
          <Card className="mt-5" bodyClassName="p-4 sm:p-6">
            <BuyFlow
              variant="page"
              params={{ asset: first(query.asset) }}
              setHeader={setHeader}
              close={close}
              openAction={openAction}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
