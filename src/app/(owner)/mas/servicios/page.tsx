import { CatalogList } from '@/features/catalog/screens';
export default function Page({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  return <CatalogList kind="services" searchParams={searchParams} />;
}
