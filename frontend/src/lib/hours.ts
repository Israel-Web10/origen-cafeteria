export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];
export type Hours = Record<Day, [string, string][]>;

export function parseHours(raw?: string): Hours | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return DAYS.every((d) => Array.isArray(parsed[d])) ? parsed : null;
  } catch {
    return null;
  }
}

/** Día y hora actuales en la zona horaria del negocio. */
function nowIn(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = get('weekday').toLowerCase().slice(0, 3) as Day;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { day, time: `${hour}:${get('minute')}` };
}

export function openStatus(hours: Hours | null, timeZone = 'America/La_Paz'): { open: boolean; closesAt?: string; opensAt?: string; opensDay?: Day } {
  if (!hours) return { open: false };
  const { day, time } = nowIn(timeZone);
  const today = hours[day] || [];
  const current = today.find(([a, b]) => time >= a && time < b);
  if (current) return { open: true, closesAt: current[1] };
  const later = today.find(([a]) => a > time);
  if (later) return { open: false, opensAt: later[0], opensDay: day };
  const idx = DAYS.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(idx + i) % 7];
    if (hours[d]?.length) return { open: false, opensAt: hours[d][0][0], opensDay: d };
  }
  return { open: false };
}
