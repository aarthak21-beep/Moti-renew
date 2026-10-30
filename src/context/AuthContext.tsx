import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Currency } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Language } from '../i18n/translations';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginDemo: (name?: string, email?: string) => void;
  loginWithEmail: (email: string, password?: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, company?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  isFirebaseConnected: boolean;
}

const DEFAULT_DEMO_USER: UserProfile = {
  uid: 'usr_moti_demo_01',
  email: 'aarthak21@gmail.com',
  displayName: 'Aarthak Sharma',
  companyName: 'Moti Technologies',
  defaultCurrency: 'INR',
  language: 'en',
  theme: 'light',
  createdAt: '2026-01-15T10:00:00Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('moti_renew_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_DEMO_USER;
      }
    }
    return DEFAULT_DEMO_USER; // Default to demo user so the app is immediately live and interactive
  });
  const [loading, setLoading] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Sync user changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('moti_renew_user', JSON.stringify(user));
      // Apply theme
      if (user.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [user]);

  // Listen to Firebase auth if available
  useEffect(() => {
    if (!auth) {
      setIsFirebaseConnected(false);
      return;
    }

    setIsFirebaseConnected(true);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Fetch or create profile from Firestore
        if (db) {
          try {
            const userDocRef = doc(db, 'users', fbUser.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              setUser(data);
            } else {
              const newProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || 'Subscriber',
                companyName: 'My Business',
                defaultCurrency: 'INR',
                language: 'en',
                theme: 'light',
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newProfile);
              setUser(newProfile);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`, auth?.currentUser);
          }
        } else {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'User',
            defaultCurrency: 'INR',
            language: 'en',
            theme: 'light',
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginDemo = (name: string = 'Aarthak Sharma', email: string = 'aarthak21@gmail.com') => {
    const demoUser: UserProfile = {
      ...DEFAULT_DEMO_USER,
      displayName: name,
      email: email,
    };
    setUser(demoUser);
  };

  const loginWithEmail = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Simulate/Authenticate
      await new Promise((r) => setTimeout(r, 600));
      const existingUserStr = localStorage.getItem('moti_renew_user');
      let baseUser = DEFAULT_DEMO_USER;
      if (existingUserStr) {
        try {
          baseUser = JSON.parse(existingUserStr);
        } catch (_) {}
      }
      const loggedIn: UserProfile = {
        ...baseUser,
        email,
        displayName: email.split('@')[0],
      };
      setUser(loggedIn);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, company?: string): Promise<boolean> => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const newUser: UserProfile = {
        uid: 'usr_' + Date.now().toString(36),
        email,
        displayName: name,
        companyName: company || 'My Company',
        defaultCurrency: 'INR',
        language: 'en',
        theme: 'light',
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const { signInWithGoogle } = await import('../lib/firebase');
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        return true;
      }
      return false;
    } catch (err) {
      console.error('Google sign in error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.error(e);
      }
    }
    setUser(null);
    localStorage.removeItem('moti_renew_user');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (db && auth?.currentUser) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`, auth.currentUser);
      }
    }
  };

  const resetPassword = async (_email: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 700));
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginDemo,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        updateProfile,
        resetPassword,
        isFirebaseConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
