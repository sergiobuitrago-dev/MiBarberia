'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Explicit submission keeps this small directory predictable on mobile and avoids
// competing requests. Committed search/page live in the URL, including back/forward.
export function CustomerSearch({ query }: { query: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState({ committed: query, value: query });
  const [pending, startTransition] = useTransition();
  if (search.committed !== query) setSearch({ committed: query, value: query });
  function navigate(value: string) {
    const params = new URLSearchParams();
    if (value.trim()) params.set('q', value.trim());
    startTransition(() => router.push(`/clientes${params.size ? `?${params}` : ''}`, { scroll: false }));
  }
  return <form action="/clientes" method="get" noValidate onSubmit={event => {
    event.preventDefault(); if (!pending) navigate(search.value);
  }} className="mb-5" aria-busy={pending}>
    <label htmlFor="customer-query" className="field-label">Buscar nombre o teléfono</label>
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Input ref={input} id="customer-query" name="q" value={search.value} onChange={event => setSearch({ ...search, value: event.target.value })}
          placeholder="Nombre o teléfono…" autoComplete="off" maxLength={120} className="pr-12" readOnly={pending} />
        {search.value && <Button type="button" variant="ghost" aria-label="Limpiar búsqueda" disabled={pending} className="absolute top-0 right-0 h-full w-11 px-0"
          onClick={() => { setSearch({ ...search, value: '' }); input.current?.focus(); navigate(''); }}>×</Button>}
      </div>
      <Button type="submit" disabled={pending} className="w-20 px-2">{pending ? 'Buscando…' : 'Buscar'}</Button>
    </div>
    <span role="status" className="sr-only">{pending ? 'Buscando clientes…' : ''}</span>
  </form>;
}
