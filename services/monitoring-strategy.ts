export type ConnectorMethod = "openai_web_search" | "openai_computer_use" | "direct_provider_api";
export type ConnectorStatus = "modeled" | "planned" | "requires_review";

export interface MonitoringConnector {
  platform: string;
  status: ConnectorStatus;
  method: ConnectorMethod;
  directAccess: boolean;
  note: string;
}

export interface RolloutRequirement {
  title: string;
  description: string;
}

export const MONITORING_CONNECTORS: MonitoringConnector[] = [
  {
    platform: "ChatGPT-style answers",
    status: "modeled",
    method: "openai_web_search",
    directAccess: false,
    note: "Current runs use the OpenAI Responses API with web search to model shopping-style answers and collect secure sources.",
  },
  {
    platform: "Gemini",
    status: "planned",
    method: "direct_provider_api",
    directAccess: false,
    note: "A direct connector is not implemented yet. Current analytics approximate Gemini-style answer patterns rather than querying Gemini itself.",
  },
  {
    platform: "Claude",
    status: "planned",
    method: "direct_provider_api",
    directAccess: false,
    note: "A direct Claude connector is not implemented yet. Browser-agent collection would need legal and operational review before launch.",
  },
  {
    platform: "Alexa-style commerce answers",
    status: "planned",
    method: "openai_computer_use",
    directAccess: false,
    note: "Current analytics simulate Alexa-style shopping prompts. Direct voice or shopping-surface capture is not active in this codebase yet.",
  },
];

export const MULTI_ASSISTANT_RESOURCES: RolloutRequirement[] = [
  {
    title: "Provider access and terms review",
    description: "Each external assistant needs an approved integration path, test accounts, and a review of terms of service before any direct automation or scraping goes live.",
  },
  {
    title: "Async job runner",
    description: "Full multi-platform monitoring runs should move to queued background jobs with retries, status tracking, and per-platform timeouts.",
  },
  {
    title: "Geo-specific browser infrastructure",
    description: "Location-sensitive testing needs browser or API infrastructure that can control region, language, and user context without contaminating results.",
  },
  {
    title: "Evidence store",
    description: "To make analytics dependable, store raw response text, screenshots or transcripts, citation lists, and normalized facts for auditability.",
  },
  {
    title: "Human review workflow",
    description: "Flagged claims and low-evidence runs need a review queue so operators can approve or reject findings before they influence recommendations.",
  },
];
