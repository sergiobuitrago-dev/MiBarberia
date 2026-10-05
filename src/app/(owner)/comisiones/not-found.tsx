import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return <><h1 className="page-title">Barbero no disponible</h1><p className="mt-3 text-muted-foreground">No se encontró este barbero en tu barbería.</p><Button asChild className="mt-6"><Link href="/comisiones">Volver a Comisiones</Link></Button></>;
}
