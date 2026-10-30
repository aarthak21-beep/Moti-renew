import { PaymentRecord, Subscription } from '../types';
import { formatDate } from './dateUtils';

function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const stringValue = String(field);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportSubscriptionsToCSV(subscriptions: Subscription[]) {
  const headers = [
    'Service Name',
    'Provider',
    'Category',
    'Amount',
    'Currency',
    'Billing Cycle',
    'Start Date',
    'Renewal Date',
    'Payment Method',
    'Status',
    'Notes'
  ];

  const rows = subscriptions.map(sub => [
    escapeCSV(sub.serviceName),
    escapeCSV(sub.providerName || '-'),
    escapeCSV(sub.category),
    escapeCSV(sub.amount),
    escapeCSV(sub.currency),
    escapeCSV(sub.billingCycle),
    escapeCSV(sub.startDate),
    escapeCSV(sub.renewalDate),
    escapeCSV(sub.paymentMethod),
    escapeCSV(sub.status),
    escapeCSV(sub.notes || '')
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `MotiRenew_Subscriptions_${timestamp}.csv`);
}

export function exportPaymentsToCSV(payments: PaymentRecord[]) {
  const headers = [
    'Service Name',
    'Payment Date',
    'Amount',
    'Currency',
    'Payment Method',
    'Transaction Reference',
    'Status',
    'Notes'
  ];

  const rows = payments.map(pay => [
    escapeCSV(pay.serviceName),
    escapeCSV(pay.paymentDate),
    escapeCSV(pay.amount),
    escapeCSV(pay.currency),
    escapeCSV(pay.paymentMethod),
    escapeCSV(pay.transactionRef || '-'),
    escapeCSV(pay.status),
    escapeCSV(pay.notes || '')
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `MotiRenew_Payments_${timestamp}.csv`);
}

export function exportRenewalsReportToCSV(subscriptions: Subscription[]) {
  const headers = [
    'Service Name',
    'Renewal Date',
    'Amount',
    'Currency',
    'Billing Cycle',
    'Payment Method',
    'Status',
    'Days Remaining'
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = subscriptions.map(sub => {
    const diff = Math.ceil((new Date(sub.renewalDate + 'T00:00:00').getTime() - today.getTime()) / (1000 * 3600 * 24));
    return [
      escapeCSV(sub.serviceName),
      escapeCSV(formatDate(sub.renewalDate)),
      escapeCSV(sub.amount),
      escapeCSV(sub.currency),
      escapeCSV(sub.billingCycle),
      escapeCSV(sub.paymentMethod),
      escapeCSV(sub.status),
      escapeCSV(diff < 0 ? `Overdue by ${Math.abs(diff)} days` : `${diff} days left`)
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `MotiRenew_Upcoming_Renewals_${timestamp}.csv`);
}
