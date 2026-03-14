# CubixAI

CubixAI is a production-style MVP for AI visibility intelligence in shopping journeys. It helps brands understand where they appear in assistant-style answers, why they appear (or do not), and what to improve.

## Live Deployment

- Hosting URL: https://cubixaius.web.app
- Firebase project: `cubixaius`
- Deploy status: successful

## What The App Does

- Runs product/brand visibility analysis against assistant-style shopping prompts
- Scores visibility, source quality, and trust signals
- Surfaces query-level results with competitor context
- Generates website audit findings and recommendations
- Stores per-user history in Firestore

## Core Features

- Firebase email/password auth
- Protected dashboard routes
- New analysis workflow
- Results view with actionable recommendations
- History of saved analyses
- Firestore rules and indexes for user-scoped data

## Tech Stack

- Frontend: Next.js 16 (App Router), React, TypeScript, Tailwind CSS v4
- Backend: Next.js API routes
- Database: Firestore
- Auth: Firebase Authentication
- AI: OpenAI API (configured by env vars)
- Hosting: Firebase Hosting (framework integration)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
copy env.example .env.local
```

3. Configure `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_REASONING_EFFORT=low
```

4. Run locally:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Project Navigation

- `/login`: sign in/sign up
- `/dashboard`: overview of latest metrics and activity
- `/analysis/new`: start a new analysis
- `/analysis/[id]`: view a specific report
- `/history`: review saved analyses

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy To Firebase

Use direct deploy command with explicit project:

```bash
firebase deploy --project cubixaius
```

Or use npm script (if `.firebaserc` default project is configured):

```bash
npm run firebase:deploy
```

## Firestore Data Model (High Level)

### `users/{userId}`

- name
- email
- createdAt

### `analyses/{analysisId}`

- userId
- company/product input fields
- prompts/results/metrics
- recommendations
- createdAt

## Notes

- This app currently uses Firebase Hosting + a server runtime path for dynamic routes.
- If Firebase prompts for additional APIs during first deploy, enable them in the target project.
- For consistent local compatibility, Node 20 is recommended.
