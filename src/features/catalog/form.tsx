'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { Input } from '@/components/ui/input';
import { saveCatalog, deactivateCatalog } from './actions';
import { catalogConfig } from './config';
import type { CatalogKind, CatalogState } from './validation';

export function CatalogForm({ kind, record }: { kind: CatalogKind; record?: { id: string; name: string; amount: number } }) {
  const config = catalogConfig[kind];
  const initial: CatalogState = { values: { name: record?.name ?? '', amount: record ? String(record.amount) : '' }, errors: {} };
  const [state, action, pending] = useActionState(saveCatalog.bind(null, kind), initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  return (
    <form ref={formRef} action={action} noValidate className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6">
      {record && <input type="hidden" name="id" value={record.id} />}
      {state.message && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-semibold">Nombre</label>
        <Input id="name" name="name" defaultValue={state.values.name} maxLength={120} autoComplete="off" aria-invalid={!!state.errors.name} aria-describedby={state.errors.name ? 'name-error' : undefined} disabled={pending} />
        {state.errors.name && <p id="name-error" className="text-sm text-destructive">{state.errors.name}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-semibold">{config.amountLabel}</label>
        <Input id="amount" name="amount" defaultValue={state.values.amount} inputMode={kind === 'barbers' ? 'decimal' : 'numeric'} autoComplete="off" aria-invalid={!!state.errors.amount} aria-describedby={`amount-hint${state.errors.amount ? ' amount-error' : ''}`} disabled={pending} />
        <p id="amount-hint" className="text-sm leading-relaxed text-muted-foreground">{config.hint}</p>
        {state.errors.amount && <p id="amount-error" className="text-sm text-destructive">{state.errors.amount}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button>
        {pending ? <Button disabled variant="ghost">Cancelar</Button> : <Button asChild variant="ghost"><Link href={config.path}>Cancelar</Link></Button>}
      </div>
    </form>
  );
}

export function DeactivateForm({ kind, id, name }: { kind: CatalogKind; id: string; name: string }) {
  return <ConfirmAction action={deactivateCatalog.bind(null, kind, id)}
    triggerLabel={`Desactivar ${catalogConfig[kind].singular}`} title={`¿Desactivar a ${name}?`}
    description="Dejará de aparecer en la lista de activos. Sus datos se conservarán."
    cancelLabel="Mantener activo" confirmLabel="Sí, desactivar" pendingLabel="Desactivando…" />;
}
