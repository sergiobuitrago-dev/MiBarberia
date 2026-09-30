import { CustomerEdit } from '@/features/customers/screens';
export default async function Page({ params }: PageProps<'/clientes/[id]/editar'>) {
  return <CustomerEdit id={(await params).id} />;
}
