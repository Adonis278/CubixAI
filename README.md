# CubixAi MVP

Cubix.AI is a production-style MVP for "SEO + analytics for AI-assisted shopping".

It helps brands understand:

- Whether they appear in AI-assisted shopping responses
- Which competitors appear instead
- Why their visibility is strong or weak
- What website/content improvements can increase visibility and conversions

## Features

- Firebase email/password authentication
- Protected dashboard routes for authenticated users only
- New analysis workflow (company, website, category, competitors, optional goal)
- Deterministic mock analysis pipeline (10-12 category-aware prompts)
- Query-by-query visibility results with mention/rank explanations
- Lightweight website audit (title, meta description, FAQ, schema, relevance, trust)
- Recommendation engine (3-7 actionable suggestions)
- Firestore persistence per authenticated user
- Dashboard summary cards and recent analyses list
- Analysis history page with drill-in to results
- Firebase Hosting and Firestore deployment config

## Stack

- Frontend: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Backend: Next.js API route (`/api/analyze`) + Firebase services
- Auth: Firebase Authentication (email/password)
- Database: Firestore
- Hosting: Firebase Hosting (framework integration)
- LLM: ChatGPT 4 mini

## Project Structure

```text
app/
	(auth)/login/
	(protected)/dashboard/
	(protected)/analysis/new/
	(protected)/analysis/[id]/
	(protected)/history/
	api/analyze/
components/
	analysis/
	auth/
	layout/
	ui/
firebase/
lib/
services/
types/
firestore.rules
firestore.indexes.json
firebase.json
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and configure Firebase values:

```bash
copy env.example .env.local
```

3. Update `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

4. Run the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication > Email/Password.
3. Create a Firestore database.
4. Replace `.firebaserc` project id:

```json
{
	"projects": {
		"default": "your-real-project-id"
	}
}
```

5. Deploy Firestore rules/indexes:

```bash
npx firebase-tools deploy --only firestore
```

## Run Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy to Firebase Hosting

1. Install Firebase CLI if needed:

```bash
npm i -g firebase-tools
```

2. Login:

```bash
firebase login
```

3. Deploy:

```bash
npm run firebase:deploy
```

## Firestore Data Model

### users/{userId}

- name
- email
- createdAt

### analyses/{analysisId}

- userId
- companyName
- websiteUrl
- category
- competitors
- businessDescription
- goal
- promptsAnalyzed
- visibilityScore
- mentionRate
- averageRank
- fairnessInsight
- siteAudit
- results
- recommendations
- productCatalogId
- productCatalogItemCount
- createdAt

### productCatalogs/{catalogId}

- userId
- analysisId
- companyName
- category
- sourceFileName
- itemCounk estimates, and competitor presence
- Runs lightweight website signal inspection using server-side fetch
- Structured so real LLM/search integrations can replace the mock logic later

## Future Improvements

- Replace mock analyzer with live AI shopping search integrations
- Add team workspaces and organization-level permissions
- Add trend charts across time windows
- Add scheduled analysis runs and alerts
- Add exportable reporting (PDF/CSV)
- Add event tracking for conversion diagnostics
