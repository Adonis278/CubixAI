import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/client";
import { AnalysisRecord } from "@/types/analysis";

function getDbOrThrow() {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase config is missing. Add NEXT_PUBLIC_FIREBASE_* values.");
  }
  return db;
}

export async function upsertUserProfile(user: { uid: string; email: string | null; displayName: string | null }) {
  const db = getDbOrThrow();
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) return;

  await setDoc(ref, {
    name: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email,
    createdAt: serverTimestamp(),
  });
}

export async function createAnalysisRecord(record: Omit<AnalysisRecord, "id">) {
  const db = getDbOrThrow();
  const ref = await addDoc(collection(db, "analyses"), {
    ...record,
    createdAt: record.createdAt,
  });

  return ref.id;
}

export async function getAnalysisHistory(userId: string) {
  const db = getDbOrThrow();
  const q = query(collection(db, "analyses"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<AnalysisRecord, "id">),
  }));
}

export async function getAnalysisById(analysisId: string) {
  const db = getDbOrThrow();
  const ref = doc(db, "analyses", analysisId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<AnalysisRecord, "id">),
  };
}
