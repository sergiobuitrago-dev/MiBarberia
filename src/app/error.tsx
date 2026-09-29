'use client';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">No pudimos cargar esta página</h1>
      <p role="alert" className="my-4 text-sm text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
