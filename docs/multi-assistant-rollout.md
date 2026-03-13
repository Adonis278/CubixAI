# Multi-Assistant Rollout

## Current State

The current product uses the OpenAI Responses API with web search to model assistant-style shopping answers and collect secure citation evidence.

This means the app can:

- generate 20+ shopping-oriented prompt variations
- collect HTTPS source evidence
- score visibility, source influence, and factual accuracy
- produce recommendations tied to visibility gaps and weak evidence

This does **not** mean the app is directly querying Gemini, Claude, Alexa, or other assistant UIs yet.

## What Is Needed For Direct Multi-Platform Monitoring

1. Provider access and compliance review

- Each provider needs an approved collection path.
- Browser automation against third-party UIs should not launch without terms-of-service review.

2. Connector layer

- Add direct provider connectors where official APIs exist.
- Add a browser-agent fallback only where direct APIs do not exist and use is allowed.

3. Background job system

- Long-running monitoring sweeps should run asynchronously.
- Jobs need retries, partial-failure handling, status updates, and audit logs.

4. Geo-aware execution

- Regional testing needs controllable location, language, and device context.
- Results should store the exact region configuration used for each run.

5. Evidence store

- Save raw response text, screenshots or transcripts, citations, timestamps, and normalized facts.
- This is required for trust, debugging, and customer-facing proof.

6. Human review workflow

- Flagged claims and low-evidence runs should move to a review queue before they drive reporting or recommendations.

## Recommended Next Build Steps

1. Add a `monitoring_jobs` collection and move `/api/analyze` into a queued job flow.
2. Introduce a connector interface with `collectResponses()` per platform.
3. Start with one direct non-OpenAI connector before claiming multi-platform coverage.
4. Add Cloud Storage or equivalent for screenshots and raw evidence artifacts.
5. Add an operator review view for flagged claims and low-evidence runs.
