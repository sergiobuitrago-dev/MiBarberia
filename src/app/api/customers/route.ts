import { requireOwner } from '@/lib/auth';
export async function GET(request: Request) {
  const { supabase, barbershop } = await requireOwner();
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0,120);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (q.length < 2) return Response.json({ customers: [] }, { headers });
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  const results = await Promise.all(['name','phone'].map(column => supabase.from('customers')
    .select('id,name,phone').eq('barbershop_id',barbershop.id).ilike(column,pattern).order('name').order('id').limit(10)));
  if (results.some(result => result.error)) return Response.json({ error: 'No pudimos buscar clientes.' }, { status:503, headers });
  const unique = new Map(results.flatMap(result => result.data ?? []).map(customer => [customer.id,customer]));
  return Response.json({ customers: [...unique.values()].slice(0,10) }, { headers });
}
