# CubixAi MVP Build Prompt

You are a senior full-stack engineer and product designer. Build a production-style MVP for a web app called:

**CubixAi**

## Goal

Create a proof-of-concept app that helps a business understand whether its brand shows up in AI-assisted shopping searches, why it does or does not show up, which competitors appear instead, and what website/content improvements could increase visibility and conversions.

## Tech stack requirements

* Frontend: Next.js (App Router)
* Backend: Firebase
* Hosting/Deploy: Firebase Hosting
* Database: Firestore
* Functions: Firebase Cloud Functions if needed
* Styling: Tailwind CSS
* Language: TypeScript
* Auth: Firebase Authentication (simple email/password)
* Deployment target: Firebase
* Clean, modular architecture
* Make the code easy to extend later into a full SaaS platform

## Color palette / design style

* Primary: orange
* Secondary: white
* Neutral: grey
* Modern, clean, minimal, startup-style UI
* Professional dashboard aesthetic
* Use orange for CTA buttons, highlights, score indicators, and active states
* Use white backgrounds with soft grey cards/borders
* Responsive design for desktop first, but mobile-friendly
* Elegant typography and spacing
* Smooth hover states and polished UX

## Product vision

This app is “SEO + analytics for AI-assisted shopping.”
It should help brands answer:

1. Does my company show up in AI-assisted shopping searches?
2. For which queries?
3. How often?
4. Which competitors show up instead?
5. Why do they show up and I don’t?
6. What should I improve on my site/content so I show up more often?
7. How can I drive AI-assisted search traffic to my website and convert it?

## MVP scope

Build a proof of concept that works end-to-end for one company analysis at a time.

## Core MVP flow

1. User signs in
2. User lands on dashboard
3. User submits:

   * company name
   * website URL
   * product category
   * competitor names
4. System runs a simple AI visibility analysis
5. System stores the analysis in Firestore under the authenticated user
6. User sees:

   * AI Visibility Score
   * mention rate
   * competitor mentions
   * query-by-query results
   * website audit summary
   * recommendations

## Important

For the MVP, simulate or stub AI-assisted search analysis if direct live integrations are too complex. Structure the code so real model/API integrations can be added later.
Do NOT block progress because of unavailable APIs.
If needed, create a clean mock analysis pipeline that looks realistic and uses deterministic placeholder logic.

## Main app sections

1. Auth page
2. Dashboard page
3. New Analysis page
4. Results page
5. Analysis history page

## Detailed feature requirements

### 1. Authentication

* Firebase email/password auth
* Sign up, sign in, sign out
* Protect dashboard routes
* Store user profile in Firestore
* Redirect unauthenticated users to login

### 2. New Analysis Form

Fields:

* companyName
* websiteUrl
* category
* competitors (comma-separated or dynamic tags)
* optional business description
* optional priority goal:

  * show up in AI searches
  * drive traffic to website
  * increase purchases

Validation:

* required fields
* website URL format
* clean error states

### 3. Analysis Engine (MVP)

Create a backend service that:

* accepts the analysis request
* generates a set of shopping prompts based on category
* creates query-by-query results
* determines whether the target brand appears
* identifies competitors mentioned
* calculates a simple AI Visibility Score
* generates a simple fairness / representation note
* performs a lightweight website audit
* returns recommendations

For the MVP, generate around 10–15 sample prompts, such as:

* best wireless earbuds under $200
* best project management software for small teams
* top skincare brands for acne
* best laptops for students
  Use category-aware prompt generation.

Example output model:

* promptsAnalyzed
* visibilityScore
* mentionRate
* averageRank
* competitorMentionFrequency
* fairnessInsight
* siteAudit
* recommendations
* createdAt
* userId

### 4. Query Results UI

For each query, show:

* prompt
* whether company was mentioned
* estimated rank
* competitors mentioned
* short explanation
* badge colors for success / warning / missed visibility

### 5. Website Audit

Build a lightweight audit service for the user’s website URL.
For MVP, inspect basic page signals such as:

* page title present
* meta description present
* FAQ-like content
* structured data presence (basic detection)
* category keyword relevance
* feature clarity score
* trust signals mention (reviews, shipping, returns, etc.)

Display this as:

* pass / warning / missing
* score summary
* issues found
* improvement suggestions

### 6. Recommendation Engine

Generate 3–7 recommendations such as:

* add FAQ content aligned to shopping prompts
* improve structured product data
* clarify price/features in product copy
* create comparison content
* strengthen trust signals
* improve landing page clarity for conversions

Recommendations should be shown in a polished card layout.

### 7. Dashboard

Dashboard should show:

* welcome section
* total analyses run
* latest visibility score
* recent analyses list
* quick stats cards
* CTA to run new analysis

### 8. History Page

Show saved analyses for current user from Firestore
Include:

* company
* category
* score
* date
* open results button

## Firestore data structure

Design clean collections such as:

* users
* analyses

Suggested schema:

### users/{userId}

* name
* email
* createdAt

### analyses/{analysisId}

* userId
* companyName
* websiteUrl
* category
* competitors
* businessDescription
* goal
* promptsAnalyzed
* visibilityScore
* mentionRate
* averageRank
* fairnessInsight
* siteAudit
* results
* recommendations
* createdAt

## Technical architecture expectations

* Use Next.js App Router structure
* Separate concerns clearly:

  * components/
  * lib/
  * services/
  * firebase/
  * app/
  * types/
* Use reusable UI components
* Use server actions or API routes as appropriate
* Prefer clean TypeScript interfaces
* Use Firebase client SDK where appropriate
* Use Firestore reads/writes properly
* Add loading states, empty states, and error handling
* Comment code where needed

## Deployment requirements

Set up the project so it can be deployed to Firebase.
Include:

* firebase.json
* Firestore rules
* Firebase config structure
* clear env variable usage
* Hosting-ready setup
* deployment instructions in README

## README requirements

Create a strong README with:

* project overview
* features
* stack
* local setup steps
* Firebase setup steps
* env variables needed
* how to run locally
* how to deploy to Firebase
* future improvements

## UI/UX requirements

* dashboard cards
* score visualization
* orange primary buttons
* grey borders and subtle shadows
* white content sections
* elegant empty/loading states
* responsive layout
* polished forms and result tables
* use icons where useful
* make it feel like a startup analytics platform

## Important implementation guidance

* Build a complete usable MVP, not just placeholders
* Even if parts are mocked, make the experience believable and functional
* Save all results in Firestore
* Tie every analysis record to the authenticated user
* Make route protection work
* Make the app demo-ready
* Optimize for speed of delivery and clarity of architecture
* Use realistic mock logic where external integrations are unavailable
* Write code that I can keep extending later

## Deliverables

* full Next.js project structure
* Firebase integration
* auth flow
* analysis form
* analysis pipeline
* dashboard
* results page
* history page
* Firestore persistence
* README
* deployment-ready Firebase setup

Now generate the full implementation with file-by-file code and clear structure.
