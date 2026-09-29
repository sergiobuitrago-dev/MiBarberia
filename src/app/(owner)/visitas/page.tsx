import { VisitHistory } from '@/features/visits/history';

export default function Page({ searchParams }: { searchParams: Promise<{ pagina?: string | string[] }> }) {
  return <VisitHistory searchParams={searchParams} />;
}
