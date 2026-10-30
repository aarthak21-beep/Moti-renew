import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Subscription, 
  PaymentRecord, 
  ActivityLog, 
  NotificationItem, 
  SubscriptionCategory, 
  SubscriptionStatus, 
  BillingCycle,
  Currency,
  PaymentMethod
} from '../types';
import { useAuth } from './AuthContext';
import { calculateNextRenewal, getDaysUntil } from '../utils/dateUtils';
import { getMonthlyEquivalent, getYearlyEquivalent } from '../utils/currencyUtils';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

interface SubscriptionContextType {
  subscriptions: Subscription[];
  payments: PaymentRecord[];
  activities: ActivityLog[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  loading: boolean;
  addSubscription: (sub: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  recordPayment: (payment: {
    subscriptionId: string;
    paymentDate: string;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
    status: 'Success' | 'Pending' | 'Failed';
    notes?: string;
    advanceRenewalDate?: boolean;
  }) => Promise<string>;
  deletePayment: (paymentId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // Computed metrics
  metrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    upcomingRenewals: number;
    expiredSubscriptions: number;
    monthlyExpenseINR: number;
    yearlyExpenseINR: number;
    monthlyExpenseUSD: number;
    yearlyExpenseUSD: number;
  };
}

const INITIAL_DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub_aws_01',
    userId: 'usr_moti_demo_01',
    serviceName: 'AWS Cloud Services',
    providerName: 'Amazon Web Services',
    category: 'Cloud Storage',
    amount: 14500,
    currency: 'INR',
    billingCycle: 'Monthly',
    startDate: '2025-11-01',
    renewalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    notes: 'Production VPC, EC2 clusters & S3 buckets',
    paymentMethod: 'Credit Card',
    status: 'Active',
    reminderDays: [1, 3, 7],
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2025-11-01T10:00:00Z'
  },
  {
    id: 'sub_google_workspace_02',
    userId: 'usr_moti_demo_01',
    serviceName: 'Google Workspace Business',
    providerName: 'Google LLC',
    category: 'Business Tools',
    amount: 4800,
    currency: 'INR',
    billingCycle: 'Monthly',
    startDate: '2025-08-15',
    renewalDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 days from now
    notes: '12 business email accounts + Google Meet standard',
    paymentMethod: 'Auto-Debit / NACH',
    status: 'Active',
    reminderDays: [1, 3, 7, 15],
    createdAt: '2025-08-15T12:00:00Z',
    updatedAt: '2025-08-15T12:00:00Z'
  },
  {
    id: 'sub_canva_pro_03',
    userId: 'usr_moti_demo_01',
    serviceName: 'Canva Pro Enterprise',
    providerName: 'Canva Pty Ltd',
    category: 'Software',
    amount: 3999,
    currency: 'INR',
    billingCycle: 'Yearly',
    startDate: '2025-04-10',
    renewalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
    notes: 'Brand kit and social media graphics team account',
    paymentMethod: 'UPI / GPay / PhonePe',
    status: 'Active',
    reminderDays: [1, 7, 15],
    createdAt: '2025-04-10T09:00:00Z',
    updatedAt: '2025-04-10T09:00:00Z'
  },
  {
    id: 'sub_airtel_fiber_04',
    userId: 'usr_moti_demo_01',
    serviceName: 'Airtel Xstream Fiber 300Mbps',
    providerName: 'Bharti Airtel',
    category: 'Internet',
    amount: 1179,
    currency: 'INR',
    billingCycle: 'Monthly',
    startDate: '2025-01-01',
    renewalDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    notes: 'Office broadband connection with static IP',
    paymentMethod: 'UPI / GPay / PhonePe',
    status: 'Active',
    reminderDays: [1, 3],
    createdAt: '2025-01-01T08:00:00Z',
    updatedAt: '2025-01-01T08:00:00Z'
  },
  {
    id: 'sub_chatgpt_plus_05',
    userId: 'usr_moti_demo_01',
    serviceName: 'ChatGPT Plus & Team',
    providerName: 'OpenAI',
    category: 'Software',
    amount: 20,
    currency: 'USD',
    billingCycle: 'Monthly',
    startDate: '2025-06-20',
    renewalDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Engineering team research and prompt tests',
    paymentMethod: 'Credit Card',
    status: 'Active',
    reminderDays: [1, 3, 7],
    createdAt: '2025-06-20T14:30:00Z',
    updatedAt: '2025-06-20T14:30:00Z'
  },
  {
    id: 'sub_netflix_06',
    userId: 'usr_moti_demo_01',
    serviceName: 'Netflix Premium 4K',
    providerName: 'Netflix Inc',
    category: 'Entertainment',
    amount: 649,
    currency: 'INR',
    billingCycle: 'Monthly',
    startDate: '2025-03-05',
    renewalDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days overdue!
    notes: 'Executive lounge screen + mobile devices',
    paymentMethod: 'Debit Card',
    status: 'Expired',
    reminderDays: [1, 3],
    createdAt: '2025-03-05T18:00:00Z',
    updatedAt: '2025-03-05T18:00:00Z'
  },
  {
    id: 'sub_coursera_plus_07',
    userId: 'usr_moti_demo_01',
    serviceName: 'Coursera Plus Learning',
    providerName: 'Coursera Inc',
    category: 'Education',
    amount: 399,
    currency: 'USD',
    billingCycle: 'Yearly',
    startDate: '2025-05-12',
    renewalDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Upskilling program for junior engineers',
    paymentMethod: 'Credit Card',
    status: 'Active',
    reminderDays: [7, 15],
    createdAt: '2025-05-12T11:00:00Z',
    updatedAt: '2025-05-12T11:00:00Z'
  }
];

const INITIAL_DEMO_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay_01',
    userId: 'usr_moti_demo_01',
    subscriptionId: 'sub_aws_01',
    serviceName: 'AWS Cloud Services',
    paymentDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 14500,
    currency: 'INR',
    paymentMethod: 'Credit Card',
    transactionRef: 'HDFC-CC-90823412',
    status: 'Success',
    notes: 'Monthly invoice paid in full',
    createdAt: '2026-09-30T10:00:00Z'
  },
  {
    id: 'pay_02',
    userId: 'usr_moti_demo_01',
    subscriptionId: 'sub_google_workspace_02',
    serviceName: 'Google Workspace Business',
    paymentDate: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 4800,
    currency: 'INR',
    paymentMethod: 'Auto-Debit / NACH',
    transactionRef: 'NACH-ICICI-887123',
    status: 'Success',
    notes: 'Auto-debit successful',
    createdAt: '2026-10-04T12:00:00Z'
  },
  {
    id: 'pay_03',
    userId: 'usr_moti_demo_01',
    subscriptionId: 'sub_airtel_fiber_04',
    serviceName: 'Airtel Xstream Fiber 300Mbps',
    paymentDate: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 1179,
    currency: 'INR',
    paymentMethod: 'UPI / GPay / PhonePe',
    transactionRef: 'UPI-GPAY-4029184712',
    status: 'Success',
    notes: 'Paid via GPay Business QR',
    createdAt: '2026-09-29T15:00:00Z'
  }
];

const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act_01',
    userId: 'usr_moti_demo_01',
    type: 'payment_recorded',
    title: 'Payment Recorded: AWS Cloud',
    description: 'Recorded payment of ₹14,500 via Credit Card',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'act_02',
    userId: 'usr_moti_demo_01',
    type: 'reminder_generated',
    title: 'Renewal Reminder: Airtel Fiber',
    description: 'Renewal due in 1 day (Tomorrow)',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'act_03',
    userId: 'usr_moti_demo_01',
    type: 'status_changed',
    title: 'Overdue Alert: Netflix',
    description: 'Subscription marked overdue as renewal date passed',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.uid || 'usr_moti_demo_01';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);

  // Load subscriptions and payments for current user
  useEffect(() => {
    const storageKey = `moti_renew_data_${currentUserId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSubscriptions(parsed.subscriptions || []);
        setPayments(parsed.payments || []);
        setActivities(parsed.activities || []);
      } catch (e) {
        setSubscriptions(INITIAL_DEMO_SUBSCRIPTIONS);
        setPayments(INITIAL_DEMO_PAYMENTS);
        setActivities(INITIAL_ACTIVITIES);
      }
    } else {
      // Seed with initial demo data for smooth first experience
      setSubscriptions(INITIAL_DEMO_SUBSCRIPTIONS.map(s => ({ ...s, userId: currentUserId })));
      setPayments(INITIAL_DEMO_PAYMENTS.map(p => ({ ...p, userId: currentUserId })));
      setActivities(INITIAL_ACTIVITIES.map(a => ({ ...a, userId: currentUserId })));
    }
    setLoading(false);
  }, [currentUserId]);

  // Persist to local storage whenever data changes
  useEffect(() => {
    if (!loading && currentUserId) {
      const storageKey = `moti_renew_data_${currentUserId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        subscriptions,
        payments,
        activities,
      }));
    }
  }, [subscriptions, payments, activities, currentUserId, loading]);

  // Auto-evaluate subscription status based on current date
  useEffect(() => {
    setSubscriptions(prev => {
      let changed = false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const updated = prev.map(sub => {
        const renewalDate = new Date(sub.renewalDate + 'T00:00:00');
        const isOverdue = renewalDate.getTime() < today.getTime();
        
        if (isOverdue && sub.status === 'Active') {
          changed = true;
          return { ...sub, status: 'Expired' as SubscriptionStatus };
        }
        return sub;
      });

      return changed ? updated : prev;
    });
  }, []);

  // Compute live notifications from upcoming / overdue subscriptions
  const notifications: NotificationItem[] = useMemo(() => {
    return subscriptions
      .filter(s => s.status === 'Active' || s.status === 'Expired')
      .map(s => {
        const days = getDaysUntil(s.renewalDate);
        const isOverdue = days < 0;
        return {
          id: `notif_${s.id}_${s.renewalDate}`,
          subscriptionId: s.id,
          serviceName: s.serviceName,
          renewalDate: s.renewalDate,
          daysRemaining: days,
          amount: s.amount,
          currency: s.currency,
          isOverdue,
          createdAt: new Date().toISOString(),
          read: readNotificationIds.has(`notif_${s.id}_${s.renewalDate}`)
        };
      })
      .filter(n => n.isOverdue || n.daysRemaining <= 15)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [subscriptions, readNotificationIds]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Add subscription
  const addSubscription = async (subData: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();

    const newSub: Subscription = {
      ...subData,
      id,
      userId: currentUserId,
      createdAt: now,
      updatedAt: now,
    };

    setSubscriptions(prev => [newSub, ...prev]);

    // Log activity
    const newAct: ActivityLog = {
      id: 'act_' + Date.now().toString(36),
      userId: currentUserId,
      type: 'subscription_created',
      title: `Added Subscription: ${newSub.serviceName}`,
      description: `${newSub.category} • ${newSub.currency} ${newSub.amount} (${newSub.billingCycle})`,
      timestamp: now,
    };
    setActivities(prev => [newAct, ...prev]);

    // Firestore sync if configured
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'subscriptions', id), newSub);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `subscriptions/${id}`, auth.currentUser);
      }
    }

    return id;
  };

  // Update subscription
  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const now = new Date().toISOString();
    setSubscriptions(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, ...updates, updatedAt: now };
      }
      return s;
    }));

    const target = subscriptions.find(s => s.id === id);
    if (target) {
      const newAct: ActivityLog = {
        id: 'act_' + Date.now().toString(36),
        userId: currentUserId,
        type: 'subscription_updated',
        title: `Updated: ${target.serviceName}`,
        description: `Modified subscription parameters and renewal details`,
        timestamp: now,
      };
      setActivities(prev => [newAct, ...prev]);
    }

    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'subscriptions', id), updates, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${id}`, auth.currentUser);
      }
    }
  };

  // Delete subscription
  const deleteSubscription = async (id: string) => {
    const target = subscriptions.find(s => s.id === id);
    setSubscriptions(prev => prev.filter(s => s.id !== id));

    if (target) {
      const newAct: ActivityLog = {
        id: 'act_' + Date.now().toString(36),
        userId: currentUserId,
        type: 'subscription_deleted',
        title: `Deleted: ${target.serviceName}`,
        description: `Removed subscription and reminders from tracking`,
        timestamp: new Date().toISOString(),
      };
      setActivities(prev => [newAct, ...prev]);
    }

    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'subscriptions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `subscriptions/${id}`, auth.currentUser);
      }
    }
  };

  // Record a payment with strict ledger integrity
  const recordPayment = async (data: {
    subscriptionId: string;
    paymentDate: string;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
    status: 'Success' | 'Pending' | 'Failed';
    notes?: string;
    advanceRenewalDate?: boolean;
  }): Promise<string> => {
    const targetSub = subscriptions.find(s => s.id === data.subscriptionId);
    if (!targetSub) {
      throw new Error('Subscription not found');
    }

    const paymentId = 'pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();

    const paymentRecord: PaymentRecord = {
      id: paymentId,
      userId: currentUserId,
      subscriptionId: data.subscriptionId,
      serviceName: targetSub.serviceName,
      paymentDate: data.paymentDate,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      transactionRef: data.transactionRef,
      status: data.status,
      notes: data.notes,
      createdAt: now,
    };

    // Save actual payment record to state
    setPayments(prev => [paymentRecord, ...prev]);

    // If payment is Successful and advanceRenewalDate is true, advance next renewal date correctly
    if (data.status === 'Success' && data.advanceRenewalDate !== false) {
      const nextRenewalDate = calculateNextRenewal(targetSub.renewalDate, targetSub.billingCycle);
      
      setSubscriptions(prev => prev.map(s => {
        if (s.id === data.subscriptionId) {
          return {
            ...s,
            renewalDate: nextRenewalDate,
            status: 'Active',
            updatedAt: now,
          };
        }
        return s;
      }));

      // If online, update subscription document in Firestore
      if (db && auth?.currentUser) {
        try {
          await setDoc(doc(db, 'subscriptions', data.subscriptionId), {
            renewalDate: nextRenewalDate,
            status: 'Active',
            updatedAt: now
          }, { merge: true });
        } catch (err) {
          console.warn('Could not sync renewal update to firestore:', err);
        }
      }
    }

    // Log Activity
    const newAct: ActivityLog = {
      id: 'act_' + Date.now().toString(36),
      userId: currentUserId,
      type: 'payment_recorded',
      title: `Payment Recorded: ${targetSub.serviceName}`,
      description: `Amount: ${data.currency} ${data.amount} • Ref: ${data.transactionRef || 'N/A'} • Status: ${data.status}`,
      timestamp: now,
    };
    setActivities(prev => [newAct, ...prev]);

    // Save payment to Firestore if configured
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'payments', paymentId), paymentRecord);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `payments/${paymentId}`, auth.currentUser);
      }
    }

    return paymentId;
  };

  const deletePayment = async (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'payments', paymentId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `payments/${paymentId}`, auth.currentUser);
      }
    }
  };

  const markNotificationAsRead = (id: string) => {
    setReadNotificationIds(prev => new Set(prev).add(id));
  };

  const markAllNotificationsAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotificationIds(allIds);
  };

  // Aggregated Metrics
  const metrics = useMemo(() => {
    let activeSubs = 0;
    let expiredSubs = 0;
    let upcomingRenewals = 0;
    let monthlyINR = 0;
    let yearlyINR = 0;
    let monthlyUSD = 0;
    let yearlyUSD = 0;

    subscriptions.forEach(sub => {
      const days = getDaysUntil(sub.renewalDate);
      if (sub.status === 'Active') {
        activeSubs++;
        if (days >= 0 && days <= 30) {
          upcomingRenewals++;
        }

        const mEq = getMonthlyEquivalent(sub.amount, sub.billingCycle);
        const yEq = getYearlyEquivalent(sub.amount, sub.billingCycle);

        if (sub.currency === 'INR') {
          monthlyINR += mEq;
          yearlyINR += yEq;
        } else if (sub.currency === 'USD') {
          monthlyUSD += mEq;
          yearlyUSD += yEq;
        }
      } else if (sub.status === 'Expired' || days < 0) {
        expiredSubs++;
      }
    });

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubs,
      upcomingRenewals,
      expiredSubscriptions: expiredSubs,
      monthlyExpenseINR: Math.round(monthlyINR),
      yearlyExpenseINR: Math.round(yearlyINR),
      monthlyExpenseUSD: Math.round(monthlyUSD),
      yearlyExpenseUSD: Math.round(yearlyUSD),
    };
  }, [subscriptions]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        payments,
        activities,
        notifications,
        unreadNotificationCount,
        loading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        recordPayment,
        deletePayment,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        metrics
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptions = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptions must be used within a SubscriptionProvider');
  }
  return context;
};
