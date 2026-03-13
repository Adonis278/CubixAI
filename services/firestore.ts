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

function normalizeAnalysisRecord(data: Omit<AnalysisRecord, "id"> & Partial<AnalysisRecord>): Omit<AnalysisRecord, "id"> {
  return {
    ...data,
    analysisProvider: data.analysisProvider ?? "openai",
    monitoringMode: data.monitoringMode ?? "assistant-search-monitor",
    assistantsMonitored: data.assistantsMonitored ?? [],
    queriesAnalyzed: data.queriesAnalyzed ?? 0,
    executiveSummary: data.executiveSummary ?? "",
    shareOfShelf: data.shareOfShelf ?? 0,
    averageRank: data.averageRank ?? null,
    visibilityScore: data.visibilityScore ?? 0,
    sourceInfluence: data.sourceInfluence ?? {
      officialSourceShare: 0,
      competitorSourceShare: 0,
      secureHttpsRate: 0,
      sourceTypeBreakdown: {
        official: 0,
        competitor: 0,
        marketplace: 0,
        review: 0,
        editorial: 0,
        directory: 0,
        unknown: 0,
      },
      dominantDomains: [],
    },
    accuracyMetrics: data.accuracyMetrics ?? {
      totalClaims: 0,
      verifiedClaims: 0,
      flaggedClaims: 0,
      groundedQueries: 0,
      zeroEvidenceQueries: 0,
      queriesWithClaims: 0,
      evidenceCoverageRate: 0,
      factCheckCoverageRate: 0,
      claimValidationRate: 0,
      accuracyRate: 0,
      humanReviewRequired: false,
    },
    ethicsSummary: data.ethicsSummary ?? {
      status: "review",
      hallucinationRisk: "medium",
      flaggedClaimCount: 0,
      note: "",
    },
    briefCoverage: data.briefCoverage ?? {
      score: 0,
      items: [],
    },
    assistantCoverage: data.assistantCoverage ?? [],
    sourcesReviewed: data.sourcesReviewed ?? [],
    accuracyFindings: data.accuracyFindings ?? [],
    siteAudit: data.siteAudit ?? {
      auditedUrl: data.productPageUrl ?? data.companyWebsite ?? "",
      score: 0,
      checks: [],
      issues: [],
      suggestions: [],
    },
    recommendations: data.recommendations ?? [],
    results: (data.results ?? []).map((result) => ({
      ...result,
      assistant: result.assistant ?? "ChatGPT",
      theme: result.theme ?? "best_of",
      query: result.query ?? "",
      assistantSummary: result.assistantSummary ?? "",
      observedDescription: result.observedDescription ?? "",
      productPosition: result.productPosition ?? "not_visible",
      sourceTrust: result.sourceTrust ?? "weak",
      claims: result.claims ?? [],
      citations: result.citations ?? [],
    })),
  };
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }

  return value;
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
  const ref = await addDoc(
    collection(db, "analyses"),
    stripUndefinedDeep({
      ...record,
      createdAt: record.createdAt,
    }),
  );

  return ref.id;
}

export async function getAnalysisHistory(userId: string) {
  const db = getDbOrThrow();
  const q = query(collection(db, "analyses"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...normalizeAnalysisRecord(item.data() as Omit<AnalysisRecord, "id">),
  }));
}

export async function getAnalysisById(analysisId: string) {
  const db = getDbOrThrow();
  const ref = doc(db, "analyses", analysisId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...normalizeAnalysisRecord(snapshot.data() as Omit<AnalysisRecord, "id">),
  };
}

export async function getAnalysesByIds(analysisIds: string[]) {
  const records = await Promise.all(analysisIds.map((analysisId) => getAnalysisById(analysisId)));
  return records.flatMap((record) => (record ? [record] : []));
}
