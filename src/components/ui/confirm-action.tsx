'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';

type State = { message?: string };

// Shared inline confirmation for irreversible owner operations.
export function ConfirmAction({ action, triggerLabel, title, description, cancelLabel, confirmLabel, pendingLabel, errorHelp }: {
  action: (previous: State) => Promise<State>;
  triggerLabel: string;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  errorHelp?: ReactNode;
}) {
  const [confirm, setConfirm] = useState(false);
  const [state, submit, pending] = useActionState(action, {});
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (confirm) {
      cancel.current?.focus({ preventScroll: true });
      // Keep focused controls above the fixed mobile navigation.
      cancel.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [confirm]);
  useEffect(() => { if (!pending) submitting.current = false; }, [pending, state]);
  function dismiss() {
    if (submitting.current) return;
    setConfirm(false);
    requestAnimationFrame(() => {
      trigger.current?.focus({ preventScroll: true });
      trigger.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }
  return <section className="mt-8 border-t pt-6">
    {!confirm ? <Button ref={trigger} variant="destructive" onClick={() => setConfirm(true)}>{triggerLabel}</Button> :
      <form action={submit} noValidate aria-label={title} aria-busy={pending} className="space-y-4 rounded-xl bg-card p-4"
        onSubmit={event => { if (submitting.current) event.preventDefault(); else submitting.current = true; }}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } }}>
        <h2 className="break-words font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {state.message && <div><p role="alert" className="text-sm text-destructive">{state.message}</p>{errorHelp}</div>}
        <div className="flex flex-wrap gap-2">
          <Button ref={cancel} type="button" variant="outline" disabled={pending} onClick={dismiss}>{cancelLabel}</Button>
          <Button type="submit" variant="destructive" disabled={pending} className="grid">
            <span className="col-start-1 row-start-1" aria-hidden={pending} style={{visibility: pending ? 'hidden' : 'visible'}}>{confirmLabel}</span>
            <span className="col-start-1 row-start-1" aria-hidden={!pending} style={{visibility: pending ? 'visible' : 'hidden'}}>{pendingLabel}</span>
          </Button>
        </div>
      </form>}
  </section>;
}
