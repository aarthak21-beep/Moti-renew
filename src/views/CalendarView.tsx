import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  CreditCard, 
  Send, 
  AlertCircle,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../context/SubscriptionContext';
import { translations, Language } from '../i18n/translations';
import { generateCalendarMonth, formatDate, isSameDay, getDaysUntil } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currencyUtils';

interface CalendarViewProps {
  onOpenRecordPayment: (subId: string) => void;
  onOpenWhatsApp: (subId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenRecordPayment,
  onOpenWhatsApp,
}) => {
  const { user } = useAuth();
  const { subscriptions } = useSubscriptions();

  const lang: Language = user?.language || 'en';
  const t = translations[lang] || translations.en;

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(today.toISOString().split('T')[0]);

  const calendarDays = useMemo(() => {
    return generateCalendarMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Map of date string YYYY-MM-DD -> list of subscriptions due on that date
  const renewalsByDate = useMemo(() => {
    const map = new Map<string, typeof subscriptions>();
    subscriptions.forEach(sub => {
      const list = map.get(sub.renewalDate) || [];
      list.push(sub);
      map.set(sub.renewalDate, list);
    });
    return map;
  }, [subscriptions]);

  // Subscriptions on selected date
  const selectedDateSubs = useMemo(() => {
    return renewalsByDate.get(selectedDateStr) || [];
  }, [renewalsByDate, selectedDateStr]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.nav.calendar}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visualize renewal dates, expiry deadlines, and schedule upcoming billing cycles.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-xs"
          >
            {t.calendar.today}
          </button>
          
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-900 dark:text-white min-w-[120px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Calendar Grid + Right Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day) => {
              const dueSubs = renewalsByDate.get(day.dateStr) || [];
              const isSelected = day.dateStr === selectedDateStr;
              const hasDue = dueSubs.length > 0;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : day.isToday
                      ? 'border-blue-400/80 bg-slate-50 dark:bg-slate-800/80'
                      : day.isCurrentMonth
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-900/20 opacity-40 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${day.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </div>

                  {/* Due Subscriptions Indicators */}
                  <div className="space-y-1 mt-1">
                    {dueSubs.slice(0, 2).map((sub) => (
                      <div
                        key={sub.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-between gap-0.5"
                      >
                        <span className="truncate">{sub.serviceName}</span>
                      </div>
                    ))}
                    {dueSubs.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block text-right">
                        +{dueSubs.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" />
              Renewal Due
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-blue-500" />
              Today
            </span>
          </div>

        </div>

        {/* Selected Date Inspector (1 Col) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.calendar.renewalsOnDate}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(selectedDateStr)}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {selectedDateSubs.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs">
                  <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  {t.calendar.noRenewalsOnDate}
                </div>
              ) : (
                selectedDateSubs.map((sub) => {
                  const days = getDaysUntil(sub.renewalDate);
                  return (
                    <div 
                      key={sub.id} 
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {sub.serviceName}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {sub.category} • {sub.billingCycle}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {formatCurrency(sub.amount, sub.currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          Payment: {sub.paymentMethod}
                        </span>
                        <span className={`font-semibold ${days < 0 ? 'text-red-600' : days === 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                          {days < 0 ? `${Math.abs(days)}d Overdue` : days === 0 ? 'Due Today' : `${days}d left`}
                        </span>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenRecordPayment(sub.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          Pay
                        </button>
                        <button
                          onClick={() => onOpenWhatsApp(sub.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
            Click any calendar day to inspect active subscription commitments.
          </div>
        </div>

      </div>

    </div>
  );
};
