'use client';

/**
 * The Convert page, for direct links (/dashboard/swap?from=BTC&to=ETH). The flow itself lives in
 * components/client/flows/ConvertFlow and is the same one the dashboard opens as a pop-up sheet.
 */
import { use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions } from '@/components/client/actions';
import { Card, PageHeader, Tabs } from '@/components/client/ui';
import ConvertFlow from '@/components/client/flows/ConvertFlow';

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

export default function SwapCryptoPage({ searchParams }: { searchParams: SearchParams }) {
  const query = use(searchParams);
  const router = useRouter();
  const { openAction } = useActions();
  const close = useCallback(() => router.push('/dashboard'), [router]);
  const setHeader = useCallback(() => {}, []);

  return (
    <div className="min-h-full">
      <DashboardHeader title="Convert" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <PageHeader icon={ArrowLeftRight} title="Convert" titleOnPhone={false} meta={['Exchange between your assets at the live rate']} />
          <TradeTabs value="swap" />
          <Card className="mt-5" bodyClassName="p-4 sm:p-6">
            <ConvertFlow
              variant="page"
              params={{ from: first(query.from), to: first(query.to) }}
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
