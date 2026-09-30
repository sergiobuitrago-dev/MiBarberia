'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerPicker } from './customer-picker';
import { registerVisit } from './actions';
import { cop, money, payments, MAX_MONEY, validateVisit, type VisitDraft, type VisitState } from './validation';
export type VisitBarber = { id:string; name:string };
export type VisitService = { id:string; name:string; base_price:number };
export function VisitForm({ barbers, services }: { barbers:VisitBarber[]; services:VisitService[] }) {
  const [draft,setValue] = useState<VisitDraft>({customerMode:'occasional',customerId:'',customerName:'',customerPhone:'',barberId:'',items:[],discount:'0',payment:'CASH'});
  const patch = (value:Partial<VisitDraft>) => setValue(current => ({...current,...value}));
  const [state,action,pending] = useActionState(registerVisit,{errors:{}} as VisitState);
  // Keep feedback tied to the current draft: corrected fields stop showing stale errors.
  const currentErrors = validateVisit(draft).errors;
  const errors = Object.fromEntries(Object.keys(state.errors).filter(key => currentErrors[key]).map(key => [key,currentErrors[key]]));
  const locked = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const error = useRef<HTMLDivElement>(null);
  useEffect(() => {
    locked.current = false;
    if (state.message || Object.keys(state.errors).length) {
      const field = form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (field) field.focus(); else error.current?.focus();
    }
  },[state]);
  const subtotal = draft.items.reduce((sum,item) => sum + (money(item.charged_price) ?? 0n),0n);
  const discount = money(draft.discount);
  const validTotal = draft.items.every(item => money(item.charged_price) !== null) && discount !== null && discount <= subtotal && subtotal <= MAX_MONEY;
  const total = validTotal ? subtotal - discount! : null;
  const toggle = (service:VisitService) => patch({items:draft.items.some(item => item.service_id === service.id) ? draft.items.filter(item => item.service_id !== service.id) : [...draft.items,{service_id:service.id,charged_price:String(service.base_price)}]});
  return <form ref={form} action={action} noValidate onSubmit={event => { if (locked.current) event.preventDefault(); else locked.current = true; }}>
    <input type="hidden" name="payload" value={JSON.stringify(draft)} />
    {(state.message || Object.keys(errors).length > 0) && <div ref={error} tabIndex={-1} role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{state.message ?? 'Revisa los campos indicados para registrar la visita.'}</div>}
    <fieldset disabled={pending} className="min-w-0 space-y-6 disabled:opacity-70">
      <legend className="sr-only">Datos de la visita</legend>
      <CustomerPicker draft={draft} setDraft={patch} errors={errors} />
      <section className="visit-section" aria-labelledby="barber-heading">
        <h2 id="barber-heading" className="visit-heading">¿Quién atendió?</h2>
        <div className="flex flex-wrap gap-2">{barbers.map((barber,index) => <Button key={barber.id} type="button" variant={draft.barberId === barber.id ? 'selected' : 'outline'} className="h-auto min-h-11 max-w-full py-3 whitespace-normal text-left" aria-pressed={draft.barberId === barber.id} data-invalid={index === 0 && !!errors.barber} aria-describedby={errors.barber ? 'barber-error' : undefined} onClick={() => patch({barberId:barber.id})}>{barber.name}</Button>)}</div>
        {errors.barber && <p id="barber-error" className="field-error">{errors.barber}</p>}
      </section>
      <section className="visit-section" aria-labelledby="services-heading">
        <div className="mb-3 flex items-baseline justify-between"><h2 id="services-heading" className="text-lg font-semibold">Servicios</h2><span className="text-xs text-muted-foreground">Elige uno o varios</span></div>
        <div className="space-y-2">{services.map((service,index) => {
          const item = draft.items.find(item => item.service_id === service.id);
          const fieldError = errors[`price-${service.id}`];
          return <div key={service.id} className={`overflow-hidden rounded-xl border ${item ? 'border-primary/70 bg-primary/10' : 'bg-card'}`}>
            <button type="button" aria-pressed={!!item} aria-label={`${service.name}, ${cop(service.base_price)}`} data-invalid={index === 0 && !!errors.items} aria-describedby={errors.items ? 'items-error' : undefined} onClick={() => toggle(service)} className="flex min-h-16 w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
              <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded border text-xs ${item ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{item ? '✓' : '+'}</span>
              <span className="min-w-0 flex-1 break-words font-medium">{service.name}</span><span className="text-sm tabular-nums">{cop(service.base_price)}</span>
            </button>
            {item && <div className="border-t px-4 py-3">
              <div className="flex items-center gap-3"><label htmlFor={`price-${service.id}`} className="flex-1 text-sm">Precio cobrado<span className="sr-only"> de {service.name}</span></label><Input id={`price-${service.id}`} className="w-32 bg-card text-right tabular-nums" inputMode="numeric" value={item.charged_price} aria-invalid={!!fieldError} aria-describedby={fieldError ? `error-price-${service.id}` : undefined} onChange={e => patch({items:draft.items.map(row => row.service_id === service.id ? {...row,charged_price:e.target.value} : row)})}/></div>
              {fieldError && <p id={`error-price-${service.id}`} className="field-error">{fieldError}</p>}
            </div>}
          </div>;
        })}</div>
        {errors.items && <p id="items-error" className="field-error">{errors.items}</p>}
        {draft.items.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Precios en COP, sin puntos ni decimales. El catálogo no cambia.</p>}
      </section>
      <section className="visit-section" aria-labelledby="payment-heading">
        <h2 id="payment-heading" className="visit-heading">¿Cómo pagó?</h2>
        <div className="grid grid-cols-2 gap-2">{Object.entries(payments).map(([key,label]) => <Button key={key} type="button" variant={draft.payment === key ? 'selected' : 'outline'} aria-pressed={draft.payment === key} onClick={() => patch({payment:key as VisitDraft['payment']})}>{label}</Button>)}</div>
        {errors.payment && <p className="field-error">{errors.payment}</p>}
      </section>
      <section aria-label="Resumen" className="rounded-2xl bg-card p-5">
        <div className="flex justify-between gap-2 text-sm"><span>Subtotal</span><span className="tabular-nums" data-testid="subtotal">{cop(subtotal)}</span></div>
        <div className="mt-4 flex items-center justify-between gap-3"><label htmlFor="discount" className="text-sm">Descuento (COP)</label><Input id="discount" className="w-32 text-right tabular-nums" inputMode="numeric" value={draft.discount} onChange={e => patch({discount:e.target.value})} aria-invalid={!!errors.discount} aria-describedby={errors.discount ? 'discount-error' : undefined}/></div>
        {errors.discount && <p id="discount-error" className="field-error">{errors.discount}</p>}
        <div className="mt-5 flex items-baseline justify-between gap-2 border-t pt-5"><span className="font-semibold">Total</span><strong className="text-3xl tracking-tight tabular-nums" data-testid="total" aria-live="polite">{total === null ? '—' : cop(total)}</strong></div>
        {!validTotal && <p className="field-error">Revisa los precios y el descuento.</p>}
        <Button type="submit" className="mt-5 h-12 w-full text-base" disabled={pending}>{pending ? 'Registrando…' : 'Registrar visita'}</Button>
      </section>
    </fieldset>
  </form>;
}
