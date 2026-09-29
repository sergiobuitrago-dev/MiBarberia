import type { CatalogKind } from './validation';
export const catalogConfig = {
  barbers: { title: 'Barberos', singular: 'barbero', path: '/mas/barberos', amountLabel: 'Comisión (%)', hint: 'Entre 0 y 100. Puedes usar hasta 2 decimales.', empty: 'No tienes barberos todavía', description: 'Tu equipo, con su comisión acordada.' },
  services: { title: 'Servicios', singular: 'servicio', path: '/mas/servicios', amountLabel: 'Precio (COP)', hint: 'Pesos colombianos, sin puntos ni decimales. Ejemplo: 30000.', empty: 'No tienes servicios todavía', description: 'Lo que ofreces y su precio base en pesos.' },
} satisfies Record<CatalogKind, object>;
