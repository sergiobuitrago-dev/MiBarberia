import { CatalogEditor } from '@/features/catalog/screens';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 return <CatalogEditor kind="barbers" id={id} />;
}
