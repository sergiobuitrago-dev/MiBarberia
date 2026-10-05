export type DailySale = { date: string; sales: string };

// Normalize exact integers before conversion: even enormous COP totals stay finite.
export function salesChart(sales: string[]) {
  const amounts = sales.map(value => BigInt(value));
  const max = amounts.reduce((largest, value) => value > largest ? value : largest, 0n);
  const points = amounts.map((value, index) => ({
    x: 20 + index * 40,
    y: max === 0n ? 140 : 140 - Number(value * 128000n / max) / 1000,
  }));
  return { max: max.toString(), points };
}
