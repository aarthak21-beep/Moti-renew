import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Download, 
  Edit3, 
  Trash2, 
  CreditCard, 
  Send, 
  LayoutGrid, 
  List, 
  RotateCcw,
  Tag,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  Subscription, 
  SubscriptionCategory, 
  SubscriptionStatus, 
  BillingCycle, 
  Currency 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useSubscriptions } from '../context/SubscriptionContext';
import { translations, Language } from '../i18n/translations';
import { formatCurrency } from '../utils/currencyUtils';
import { formatDate, getDaysUntil } from '../utils/dateUtils';
import { exportSubscriptionsToCSV } from '../utils/csvExport';

interface SubscriptionsViewProps {
  onOpenAddModal: () => void;
  onEditSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (sub: Subscription) => void;
  onOpenRecordPayment: (subId: string) => void;
  onOpenWhatsApp: (subId: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  onOpenAddModal,
  onEditSubscription,
  onDeleteSubscription,
  onOpenRecordPayment,
  onOpenWhatsApp,
}) => {
  const { user } = useAuth();
  const { subscriptions } = useSubscriptions();

  const lang: Language = user?.language || 'en';
  const t = translations[lang] || translations.en;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'renewalDate' | 'amountDesc' | 'amountAsc' | 'name'>('renewalDate');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filter and sort subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        const matchesSearch = 
          sub.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sub.providerName && sub.providerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (sub.notes && sub.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === 'all' || sub.category === selectedCategory;
        const matchesStatus = selectedStatus === 'all' || sub.status === selectedStatus;
        const matchesCycle = selectedCycle === 'all' || sub.billingCycle === selectedCycle;

        return matchesSearch && matchesCategory && matchesStatus && matchesCycle;
      })
      .sort((a, b) => {
        if (sortBy === 'renewalDate') {
          return new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime();
        }
        if (sortBy === 'amountDesc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'amountAsc') {
          return a.amount - b.amount;
        }
        if (sortBy === 'name') {
          return a.serviceName.localeCompare(b.serviceName);
        }
        return 0;
      });
  }, [subscriptions, searchTerm, selectedCategory, selectedStatus, selectedCycle, sortBy]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedCycle('all');
    setSortBy('renewalDate');
  };

  const getStatusBadge = (status: SubscriptionStatus, days: number) => {
    if (status === 'Expired' || days < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900">
          <AlertCircle className="w-3 h-3" />
          {days < 0 ? `${Math.abs(days)}d Overdue` : 'Expired'}
        </span>
      );
    }
    if (status === 'Paused') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Paused
        </span>
      );
    }
    if (status === 'Cancelled') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Cancelled
        </span>
      );
    }
    // Active
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
          <Clock className="w-3 h-3" />
          {days === 0 ? 'Due Today' : `${days}d left`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        Active ({days}d)
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.nav.subscriptions}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your tools, SaaS, cloud infrastructure, and services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSubscriptionsToCSV(filteredSubscriptions)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.actions.exportCSV}</span>
          </button>
          
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.actions.addSubscription}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.actions.search}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shrink-0"
            >
              <option value="all">{t.actions.filterByCategory}</option>
              <option value="Software">Software</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Business Tools">Business Tools</option>
              <option value="Cloud Storage">Cloud Storage</option>
              <option value="Internet">Internet</option>
              <option value="Other">Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shrink-0"
            >
              <option value="all">{t.actions.filterByStatus}</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Billing Cycle Filter */}
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shrink-0"
            >
              <option value="all">{t.actions.filterByCycle}</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition shrink-0"
            >
              <option value="renewalDate">Sort: Renewal Date</option>
              <option value="amountDesc">Sort: Highest Cost</option>
              <option value="amountAsc">Sort: Lowest Cost</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>

            {/* Reset */}
            {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedCycle !== 'all') && (
              <button
                onClick={resetFilters}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                title={t.actions.resetFilters}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shrink-0 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-400'}`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-400'}`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions</span>
          {filteredSubscriptions.length > 0 && (
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Total displayed: {formatCurrency(filteredSubscriptions.reduce((acc, s) => acc + s.amount, 0), 'INR')}
            </span>
          )}
        </div>
      </div>

      {/* Content: Empty State or Results */}
      {filteredSubscriptions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t.empty.noSubscriptions}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or create a new subscription entry now.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            + {t.actions.addSubscription}
          </button>
        </div>
      ) : viewMode === 'table' ? (
        
        /* Table View */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Service & Provider</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Cost & Cycle</th>
                  <th className="py-3 px-4">Renewal Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredSubscriptions.map((sub) => {
                  const days = getDaysUntil(sub.renewalDate);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      
                      {/* Service & Provider */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {sub.serviceName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[180px]">
                              {sub.serviceName}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {sub.providerName || sub.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          {t.categories[sub.category] || sub.category}
                        </span>
                      </td>

                      {/* Cost & Cycle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {formatCurrency(sub.amount, sub.currency)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          {t.billingCycles[sub.billingCycle] || sub.billingCycle}
                        </span>
                      </td>

                      {/* Renewal Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 dark:text-white block">
                          {formatDate(sub.renewalDate)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today' : `in ${days} days`}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
                        {sub.paymentMethod}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(sub.status, days)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenRecordPayment(sub.id)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 transition"
                            title="Record Renewal Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>

                          <button
                            onClick={() => onOpenWhatsApp(sub.id)}
                            className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300 transition"
                            title="Send WhatsApp Alert"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onEditSubscription(sub)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Subscription"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteSubscription(sub)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Delete Subscription"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubscriptions.map((sub) => {
            const days = getDaysUntil(sub.renewalDate);
            return (
              <div 
                key={sub.id} 
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-xs transition space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {sub.serviceName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {sub.serviceName}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {sub.providerName || sub.category}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(sub.status, days)}
                  </div>

                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(sub.amount, sub.currency)} / {sub.billingCycle}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Renewal Date:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDate(sub.renewalDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Payment Via:</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px]">
                        {sub.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {sub.notes && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                      &quot;{sub.notes}&quot;
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenRecordPayment(sub.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                    >
                      Pay Renewal
                    </button>
                    <button
                      onClick={() => onOpenWhatsApp(sub.id)}
                      className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300 transition"
                      title="WhatsApp Reminder"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditSubscription(sub)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSubscription(sub)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
