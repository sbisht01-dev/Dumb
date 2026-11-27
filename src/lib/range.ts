export type Range = '1M' | '3M' | '1Y' | 'ALL';

export const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: '1M', label: '1M', days: 31 },
  { id: '3M', label: '3M', days: 92 },
  { id: '1Y', label: '1Y', days: 366 },
  { id: 'ALL', label: 'All', days: null },
];

export const rangeStart = (r: Range) => {
  const d = RANGES.find((x) => x.id === r)!.days;
  return d == null ? 0 : Date.now() - d * 86_400_000;
};
