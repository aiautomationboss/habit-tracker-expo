import { addDays, format, parseISO, subDays } from 'date-fns';

export const DATE_FMT = 'yyyy-MM-dd';

export function dateKey(d: Date = new Date()): string {
  return format(d, DATE_FMT);
}

export function dayKeyOffset(offset: number): string {
  return format(subDays(new Date(), offset), DATE_FMT);
}

export function addDayKey(start: string, days: number): string {
  return format(addDays(parseISO(start), days), DATE_FMT);
}

export function parseKey(key: string): Date {
  return parseISO(key);
}
