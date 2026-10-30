import { BillingCycle } from '../types';

export function calculateNextRenewal(fromDateStr: string, cycle: BillingCycle): string {
  const date = new Date(fromDateStr);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  const next = new Date(date);
  switch (cycle) {
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next.toISOString().split('T')[0];
}

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string, locale: string = 'en-US'): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1 + 'T00:00:00') : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2 + 'T00:00:00') : date2;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function generateCalendarMonth(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
  const totalDays = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];

  // Previous month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date,
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remainingCells = 42 - days.length;
  if (remainingCells < 7 || days.length <= 35) {
    const targetLength = days.length <= 35 ? 35 : 42;
    const toAdd = targetLength - days.length;
    for (let d = 1; d <= toAdd; d++) {
      const date = new Date(year, month + 1, d);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }
  }

  return days;
}
