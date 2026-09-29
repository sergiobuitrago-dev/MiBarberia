import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VisitNotFound() {
  return <>
    <h1 className="page-title">Visita no disponible</h1>
    <p className="mt-3 mb-6 text-muted-foreground">Vuelve al historial para consultar tus visitas.</p>
    <Button asChild variant="outline"><Link href="/visitas">Volver al historial</Link></Button>
  </>;
}
