'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VisitDraft } from './validation';
type Customer = { id:string; name:string; phone:string|null };
export function CustomerPicker({ draft, setDraft, errors }: { draft: VisitDraft; setDraft: (patch: Partial<VisitDraft>) => void; errors: Record<string,string> }) {
  const [query,setQuery] = useState('');
  const [result,setResult] = useState<{ query: string; customers: Customer[]; error?: string }>({ query:'',customers:[] });
  const [selected,setSelected] = useState<Customer|null>(null);
  const searching = draft.customerMode === 'existing' && !draft.customerId && query.trim().length >= 2;
  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/customers?q=${encodeURIComponent(query)}`, { signal:controller.signal, cache:'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setResult({ query,customers:data.customers });
      } catch { if (!controller.signal.aborted) setResult({ query,customers:[],error:'No pudimos buscar. Cambia la búsqueda para intentarlo de nuevo.' }); }
    },250);
    return () => { clearTimeout(timeout); controller.abort(); };
  },[query,searching]);
  return <section aria-labelledby="customer-heading" className="visit-section">
    <h2 id="customer-heading" className="visit-heading">Cliente</h2>
    <div className="flex flex-wrap gap-2">
      {([['occasional','Ocasional'],['existing','Buscar cliente'],['new','+ Cliente nuevo']] as const).map(([mode,label]) => <Button key={mode} type="button" variant={draft.customerMode === mode ? 'default' : 'outline'} aria-pressed={draft.customerMode === mode} onClick={() => setDraft({customerMode:mode})}>{label}</Button>)}
    </div>
    {draft.customerMode === 'occasional' && <p className="mt-3 text-sm text-muted-foreground">Cliente ocasional · sin datos personales.</p>}
    {draft.customerMode === 'new' && <div className="mt-4 space-y-4 rounded-xl bg-muted p-4">
      <div><label className="field-label" htmlFor="customer-name">Nombre del cliente *</label><Input id="customer-name" value={draft.customerName} onChange={e => setDraft({customerName:e.target.value})} maxLength={120} autoComplete="name" aria-invalid={!!errors.customerName} aria-describedby={errors.customerName ? 'customer-name-error' : undefined}/>{errors.customerName && <p id="customer-name-error" className="field-error">{errors.customerName}</p>}</div>
      <div><label className="field-label" htmlFor="customer-phone">Teléfono (opcional)</label><Input id="customer-phone" type="tel" value={draft.customerPhone} onChange={e => setDraft({customerPhone:e.target.value})} maxLength={30} autoComplete="tel" aria-invalid={!!errors.customerPhone} aria-describedby={errors.customerPhone ? 'customer-phone-error' : undefined}/>{errors.customerPhone && <p id="customer-phone-error" className="field-error">{errors.customerPhone}</p>}</div>
      <p className="text-xs text-muted-foreground">Se creará al registrar la visita.</p>
    </div>}
    {draft.customerMode === 'existing' && <div className="mt-4">
      {draft.customerId && selected ? <div className="flex items-center justify-between gap-2 rounded-xl border p-3"><div className="min-w-0"><p className="break-words font-semibold">{selected.name}</p><p className="text-sm text-muted-foreground">{selected.phone}</p></div><Button type="button" variant="ghost" onClick={() => setDraft({customerId:''})}>Cambiar</Button></div> : <>
        <label htmlFor="customer-search" className="field-label">Buscar por nombre o teléfono</label><Input id="customer-search" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" aria-invalid={!!errors.customer} aria-describedby="customer-search-status" />
        <p id="customer-search-status" role="status" className="mt-2 text-sm text-muted-foreground">{query.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : result.query !== query ? 'Buscando…' : result.error ?? (result.customers.length ? 'Selecciona un cliente. Se muestran hasta 10 resultados.' : 'No encontramos clientes. Puedes crear uno nuevo.')}</p>
        {result.query === query && searching && <ul className="mt-2 divide-y rounded-xl border">{result.customers.map(customer => <li key={customer.id}><button type="button" className="w-full p-3 text-left hover:bg-muted focus-visible:outline-2" onClick={() => { setSelected(customer); setDraft({customerId:customer.id}); }}><span className="block break-words font-medium">{customer.name}</span><span className="block text-sm text-muted-foreground">{customer.phone ?? 'Sin teléfono'}</span></button></li>)}</ul>}
      </>}
    </div>}
    {errors.customer && <p className="field-error">{errors.customer}</p>}
  </section>;
}
