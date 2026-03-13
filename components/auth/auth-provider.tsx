"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/client";
import { upsertUserProfile } from "@/services/firestore";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  const syncUserProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      return;
    }

    await upsertUserProfile({
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
    });
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      try {
        await syncUserProfile(currentUser);
      } catch (error) {
        console.error("Failed to sync the signed-in user profile.", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, syncUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase config missing");

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setUser(credential.user);
      await syncUserProfile(credential.user);
    } finally {
      setLoading(false);
    }
  }, [syncUserProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase config missing");

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(credential.user);
      await syncUserProfile(credential.user);
    } finally {
      setLoading(false);
    }
  }, [syncUserProfile]);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOutUser,
    }),
    [user, loading, signIn, signUp, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
