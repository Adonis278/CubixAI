import { AnalysisGoal, NewAnalysisInput } from "@/types/analysis";

type UploadColumnKey =
  | "productName"
  | "companyName"
  | "companyWebsite"
  | "productPageUrl"
  | "productCategory"
  | "targetAudience"
  | "location"
  | "competitorBrands"
  | "authoritativeFacts"
  | "goal";

export interface ImportedAnalysisRow {
  rowNumber: number;
  input: NewAnalysisInput;
}

const GOALS: AnalysisGoal[] = [
  "increase AI share of shelf",
  "improve local ranking",
  "reduce factual errors",
];

export const REQUIRED_UPLOAD_COLUMNS = [
  "Product Name",
  "Company Name",
  "Company Website",
  "Product Page URL",
  "Product Category",
  "Target Audience",
  "Location",
  "Competitor Brands",
  "Authoritative Product Facts",
] as const;

const HEADER_ALIASES: Record<string, UploadColumnKey> = {
  productname: "productName",
  companyname: "companyName",
  companywebsite: "companyWebsite",
  companyurl: "companyWebsite",
  productpageurl: "productPageUrl",
  producturl: "productPageUrl",
  productcategory: "productCategory",
  targetaudience: "targetAudience",
  audience: "targetAudience",
  location: "location",
  competitorbrands: "competitorBrands",
  competitors: "competitorBrands",
  authoritativeproductfacts: "authoritativeFacts",
  authoritativefacts: "authoritativeFacts",
  productfacts: "authoritativeFacts",
  goal: "goal",
};

const REQUIRED_FIELDS: UploadColumnKey[] = [
  "productName",
  "companyName",
  "companyWebsite",
  "productPageUrl",
  "productCategory",
  "targetAudience",
  "location",
  "competitorBrands",
  "authoritativeFacts",
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isAnalysisGoal(value: string): value is AnalysisGoal {
  return GOALS.includes(value as AnalysisGoal);
}

function ensureHttpsUrl(value: string, label: string, rowNumber: number) {
  try {
    const parsed = new URL(value.trim());

    if (parsed.protocol !== "https:") {
      throw new Error();
    }

    return parsed.toString();
  } catch {
    throw new Error(`Row ${rowNumber}: ${label} must be a valid HTTPS URL.`);
  }
}

function splitCompetitorBrands(value: string) {
  return value
    .split(/[;,|]/)
    .flatMap((chunk) => chunk.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (character === "\"") {
      if (inQuotes && csvText[index + 1] === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && csvText[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  currentRow.push(currentValue);

  if (currentRow.some((value) => value.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim().length > 0));
}

export function parseAnalysisUpload(csvText: string, fallbackGoal: AnalysisGoal): ImportedAnalysisRow[] {
  const rows = parseCsvRows(csvText.trim());

  if (rows.length < 2) {
    throw new Error("Upload a CSV with a header row and at least one product row.");
  }

  const headers = rows[0].map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? null);
  const missingFields = REQUIRED_FIELDS.filter((field) => !headers.includes(field));

  if (missingFields.length > 0) {
    const missingLabels = REQUIRED_UPLOAD_COLUMNS.filter((label) =>
      missingFields.includes(HEADER_ALIASES[normalizeHeader(label)]),
    );
    throw new Error(`CSV is missing required columns: ${missingLabels.join(", ")}.`);
  }

  return rows.slice(1).map((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const mapped: Partial<Record<UploadColumnKey, string>> = {};

    headers.forEach((header, columnIndex) => {
      if (!header) return;
      mapped[header] = (row[columnIndex] ?? "").trim();
    });

    for (const field of REQUIRED_FIELDS) {
      if (!mapped[field]) {
        const label = REQUIRED_UPLOAD_COLUMNS.find((columnLabel) => HEADER_ALIASES[normalizeHeader(columnLabel)] === field) ?? field;
        throw new Error(`Row ${rowNumber}: ${label} is required.`);
      }
    }

    const competitorBrands = splitCompetitorBrands(mapped.competitorBrands ?? "");

    if (competitorBrands.length === 0) {
      throw new Error(`Row ${rowNumber}: Competitor Brands must include at least one brand.`);
    }

    if ((mapped.authoritativeFacts ?? "").length < 20) {
      throw new Error(`Row ${rowNumber}: Authoritative Product Facts must be at least 20 characters.`);
    }

    const goalValue = mapped.goal?.trim();
    if (goalValue && !isAnalysisGoal(goalValue)) {
      throw new Error(`Row ${rowNumber}: Goal must be one of ${GOALS.join(", ")}.`);
    }

    return {
      rowNumber,
      input: {
        productName: mapped.productName ?? "",
        companyName: mapped.companyName ?? "",
        companyWebsite: ensureHttpsUrl(mapped.companyWebsite ?? "", "Company Website", rowNumber),
        productPageUrl: ensureHttpsUrl(mapped.productPageUrl ?? "", "Product Page URL", rowNumber),
        productCategory: mapped.productCategory ?? "",
        targetAudience: mapped.targetAudience ?? "",
        location: mapped.location ?? "",
        competitorBrands,
        authoritativeFacts: mapped.authoritativeFacts ?? "",
        goal: (goalValue as AnalysisGoal | undefined) ?? fallbackGoal,
      },
    };
  });
}
