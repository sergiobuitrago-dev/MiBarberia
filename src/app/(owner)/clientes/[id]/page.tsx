import { CustomerProfile } from '@/features/customers/screens';
export default async function Page({ params, searchParams }: PageProps<'/clientes/[id]'>) {
  return <CustomerProfile id={(await params).id} searchParams={searchParams} />;
}
