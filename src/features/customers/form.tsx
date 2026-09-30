'use client';
import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveCustomer } from './actions';
import type { CustomerState } from './validation';

export function CustomerForm({ customer }: { customer: { id: string; name: string; phone: string | null } }) {
  const initial: CustomerState = { values: { name: customer.name, phone: customer.phone ?? '' }, errors: {} };
  const [state, action, pending] = useActionState(saveCustomer.bind(null, customer.id), initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [state]);
  return <form ref={formRef} action={action} noValidate className="space-y-5 rounded-2xl bg-card p-5">
    {state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    <div>
      <label htmlFor="name" className="field-label">Nombre</label>
      <Input id="name" name="name" defaultValue={state.values.name} maxLength={120} autoComplete="name" disabled={pending} aria-invalid={!!state.errors.name} aria-describedby={state.errors.name ? 'name-error' : undefined} />
      {state.errors.name && <p id="name-error" className="field-error">{state.errors.name}</p>}
    </div>
    <div>
      <label htmlFor="phone" className="field-label">Teléfono (opcional)</label>
      <Input id="phone" name="phone" type="tel" defaultValue={state.values.phone} maxLength={30} autoComplete="tel" disabled={pending} aria-invalid={!!state.errors.phone} aria-describedby={state.errors.phone ? 'phone-error' : undefined} />
      {state.errors.phone && <p id="phone-error" className="field-error">{state.errors.phone}</p>}
    </div>
    <div className="flex flex-col gap-2">
      <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button>
      {pending ? <Button disabled variant="ghost">Cancelar</Button> : <Button asChild variant="ghost"><Link href={`/clientes/${customer.id}`}>Cancelar</Link></Button>}
    </div>
  </form>;
}
