import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return <section><h1 className="page-title">Cliente no disponible</h1><p className="mt-3 text-muted-foreground">No pudimos encontrar este cliente.</p><Button asChild className="mt-6"><Link href="/clientes">Volver a Clientes</Link></Button></section>;
}
