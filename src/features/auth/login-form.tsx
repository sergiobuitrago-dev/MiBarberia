'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { email: '' });
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.fieldErrors?.email) emailRef.current?.focus();
    else if (state.fieldErrors?.password) passwordRef.current?.focus();
    else if (state.error) errorRef.current?.focus();
  }, [state]);

  return (
    <form action={action} noValidate aria-busy={pending} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">Correo electrónico</label>
        <Input ref={emailRef} id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} defaultValue={state.email} required aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby="email-error" />
        <p id="email-error" className="mt-1 min-h-5 text-sm text-destructive">{state.fieldErrors?.email}</p>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label>
        <div className="relative">
          <Input ref={passwordRef} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={1024} required className="pr-24" aria-invalid={Boolean(state.fieldErrors?.password)} aria-describedby="password-error" />
          <Button type="button" variant="ghost" className="absolute inset-y-0 right-0 rounded-l-none" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar' : 'Mostrar'}</Button>
        </div>
        <p id="password-error" className="mt-1 min-h-5 text-sm text-destructive">{state.fieldErrors?.password}</p>
      </div>
      <div className="min-h-12">
        {state.error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-md text-sm text-destructive outline-offset-4">{state.error}</p>}
      </div>
      <Button type="submit" disabled={pending} className="w-full" aria-live="polite">{pending ? 'Entrando…' : 'Entrar'}</Button>
    </form>
  );
}
