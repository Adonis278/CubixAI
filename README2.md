# CubixAI Technical & Feature Walkthrough

This document explains the current implementation of the app, including the tech stack, architecture, and how each major feature works end-to-end.

## 1) Tech Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript (strict mode)
- UI: React 19 + Tailwind CSS v4
- Auth: Firebase Authentication (email/password)
- Database: Firestore
- AI Analysis Engine: OpenAI Responses API (web search tool)
- Validation: Zod
- Icons/UI helpers: lucide-react, clsx
- Date formatting: date-fns
- Hosting/Deploy target: Firebase Hosting + Firestore rules/indexes

## 2) High-Level Architecture

- App UI and routing live in `app/` using Next App Router groups:
  - `(auth)` for login
  - `(protected)` for authenticated pages
- Client-side services in `services/` handle:
  - API calling (`analysis-api.ts`)
  - Firestore CRUD (`firestore.ts`)
  - Monitoring metadata (`monitoring-strategy.ts`)
- Server-side analysis runs in `app/api/analyze/route.ts` and `services/analysis-engine.ts`.
- Shared domain types are in `types/analysis.ts`.
- Firebase client bootstrap is in `firebase/client.ts`.

## 3) Route Map

- `/` -> redirects to `/dashboard`
- `/login` -> sign in/sign up page
- `/dashboard` -> summary cards + recent runs
- `/analysis/new` -> form to start a new monitoring run
- `/analysis/[id]` -> full results for one run
- `/history` -> table view of saved runs
- `/api/analyze` (POST) -> validates request, calls OpenAI analysis engine, returns structured result JSON

## 4) Auth & Access Control

### How it works

1. `AuthProvider` wraps the whole app in `app/layout.tsx`.
2. Provider listens to Firebase auth state (`onAuthStateChanged`).
3. On sign-up/sign-in:
   - Firebase auth creates or authenticates account
   - profile upsert runs in Firestore `users/{uid}`
4. Protected pages are wrapped by `AuthGuard` in `(protected)/layout.tsx`.
5. If user is not authenticated, guard redirects to `/login?next=...`.

### Notes

- Login page supports both sign-in and sign-up in a single UI.
- Login route sanitizes `next` to prevent open redirect patterns (`//...`).

## 5) New Monitoring Analysis (Core Feature)

### User input

The form (`components/analysis/new-analysis-form.tsx`) collects:

- productName
- companyName
- companyWebsite
- optional productPageUrl
- targetAudience
- location
- productCategory
- competitorBrands (comma-separated)
- authoritativeFacts (truth set used for fact checks)
- goal (`increase AI share of shelf`, `improve local ranking`, `reduce factual errors`)

### Validation and submit flow

1. Client validates required fields and URL formats.
2. Builds `NewAnalysisInput` payload.
3. Calls `requestAnalysis()` -> `POST /api/analyze`.
4. On success, merges returned analysis with user metadata and saves to Firestore via `createAnalysisRecord()`.
5. Redirects user to `/analysis/{id}`.

## 6) API Layer (`/api/analyze`)

### What happens in the endpoint

1. Parse request JSON.
2. Validate input with Zod schema.
3. Call `runOpenAIAnalysis(parsed.data)`.
4. Return structured analysis JSON.
5. Handle typed errors:
   - missing OpenAI config
   - invalid OpenAI response format
   - OpenAI transport/rate/auth/server errors

## 7) Analysis Engine Internals

The engine is in `services/analysis-engine.ts`.

### Query strategy

- Assistants modeled: `ChatGPT`, `Gemini`, `Alexa`
- Themes: `best_of`, `budget`, `simple`, `local`, `audience_fit`, `trusted`, `comparison`
- Query library: 3 assistants x 7 themes = 21 monitored queries

### For each query

1. Build prompt with company/product context and authoritative facts.
2. Use OpenAI Responses API with `web_search` tool.
3. Force JSON output with Zod format (`zodTextFormat`).
4. Parse and normalize response (including fallback parsing path).
5. Keep HTTPS citations only and drop blocked low-signal domains.
6. Classify sources (official, competitor, marketplace, review, etc.).
7. Mark mention visibility, estimated rank, and source trust.

### Additional analysis steps

- Website snapshot + audit:
  - title/meta/schema/FAQ/audience/location/trust/category checks
- Claim verification:
  - compare extracted claims against authoritative facts + crawled site text
- Metric generation:
  - share of shelf
  - average rank
  - source influence metrics
  - accuracy metrics (evidence coverage, claim validation, fact-check coverage)
  - ethics summary (`healthy`, `review`, `critical`)
  - brief coverage checklist
  - assistant-by-assistant coverage
  - visibility score (weighted combined score)
- Recommendation engine:
  - produces prioritized actions from performance gaps and goal

## 8) Results Experience (`/analysis/[id]`)

The `ResultsView` component renders a full report with:

- KPI cards (share of shelf, visibility, rank, accuracy, evidence, brief coverage)
- executive summary
- ethics and trust panel
- brief coverage checklist
- trend signals (strongest/weakest query theme)
- platform readiness status and rollout resources
- assistant coverage cards (per assistant metrics)
- source influence breakdown + dominant domains
- site readiness audit checks
- recommendations
- secure source library
- accuracy/human review queue
- query monitoring matrix (assistant/theme/query/position/rank/trust/details)

## 9) Dashboard & History

### Dashboard (`/dashboard`)

- Loads user-scoped run history from Firestore
- Computes aggregate stats:
  - total runs
  - average share of shelf
  - average accuracy
  - average brief coverage
  - total flagged claims
- Shows recent runs and connector status cards

### History (`/history`)

- Loads all user analyses sorted by newest first
- Displays table with:
  - product/company
  - location
  - share of shelf
  - accuracy
  - ethics status
  - date
  - link to full results

## 10) Data Model

### `users/{userId}`

- name
- email
- createdAt

### `analyses/{analysisId}`

Stored shape is `AnalysisRecord` and includes:

- input fields (product/company/audience/location/category/competitors/facts/goal)
- generated analytics (results, metrics, ethics, audit, recommendations)
- userId
- createdAt

## 11) Security & Data Access

Firestore rules enforce per-user isolation:

- `users/{userId}` readable/writable only by owner
- `analyses/{analysisId}`:
  - create only when `request.resource.data.userId == request.auth.uid`
  - read/update/delete only when `resource.data.userId == request.auth.uid`

Index support:

- Composite index on analyses: `userId ASC`, `createdAt DESC`

## 12) Environment Variables

From `env.example`:

- Firebase public config (`NEXT_PUBLIC_FIREBASE_*`)
- OpenAI server config:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (default in code: `gpt-5-mini`)
  - `OPENAI_REASONING_EFFORT`

## 13) Important Product Reality

The product currently models multi-assistant monitoring through OpenAI-powered web-search analysis. It does not directly query Gemini/Claude/Alexa native APIs yet.

This is also documented in `docs/multi-assistant-rollout.md` and reflected in `MONITORING_CONNECTORS`.

## 14) How the App Works in One Flow

1. User signs in.
2. User submits a monitoring run form.
3. Backend runs 21 assistant-style queries through OpenAI web-search analysis.
4. Engine computes visibility, source trust, accuracy, ethics, and recommendations.
5. App stores the final analysis in Firestore under the authenticated user.
6. User sees a detailed report and can revisit it from Dashboard/History.
