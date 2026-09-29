'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from './actions';

export function LogoutButton() {
  const [state, action, pending] = useActionState(signOut, {});
  return (
    <form action={action} noValidate className="mt-6" aria-busy={pending}>
      <Button type="submit" variant="outline" disabled={pending} className="w-full" aria-live="polite">{pending ? 'Cerrando sesión…' : 'Cerrar sesión'}</Button>
      {state.error && <p role="alert" className="mt-2 text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
