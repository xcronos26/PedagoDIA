/** Returns the current date/time in Brasília timezone (UTC-3) */
export function getBrasiliaDate(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs - 3 * 60 * 60 * 1000);
}

/** Converts a Date to an ISO date string (YYYY-MM-DD) */
export function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns today's date in ISO format using Brasília time */
export function getBrasiliaToday(): string {
  return toISO(getBrasiliaDate());
}

/**
 * Returns the Mon–Fri dates of the week at a given offset from the current week.
 * weekOffset=0 → current week, weekOffset=-1 → previous week, etc.
 */
export function getWeekDays(weekOffset = 0): string[] {
  const today = getBrasiliaDate();
  const dow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const mondayDelta = dow === 0 ? -6 : 1 - dow;
  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayDelta + i + weekOffset * 7);
    days.push(toISO(d));
  }
  return days;
}

/** Parses an ISO date string to a Date at local noon (avoids timezone shifts) */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Formats an ISO date string as DD/MM/YYYY (Brazilian standard) */
export function formatBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** Day-of-week abbreviation for an ISO date string (pt-BR) */
export function formatDayOfWeek(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00');
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
}

/** Short day label DD/MM */
export function formatDayLabel(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}
