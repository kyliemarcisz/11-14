// openFDA drug-label grounding for HarborDose safety answers.
// Every safety verdict must be traceable to text from the official FDA label.

export interface DrugLabel {
  drug: string; // the name we searched for
  boxedWarning?: string;
  contraindications?: string;
  warnings?: string;
  drugInteractions?: string;
  dosageAndAdministration?: string;
}

const OPENFDA_URL = 'https://api.fda.gov/drug/label.json';
const SECTION_CHAR_LIMIT = 3500;
const cache = new Map<string, DrugLabel | null>();

function firstSection(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const text = String(value[0]).replace(/\s+/g, ' ').trim();
  return text.slice(0, SECTION_CHAR_LIMIT);
}

async function queryOpenFda(field: string, name: string): Promise<any | null> {
  const search = `${field}:"${name}"`;
  const url = `${OPENFDA_URL}?search=${encodeURIComponent(search)}&limit=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch (and cache) the FDA label for a drug by generic name, falling back to brand name. */
export async function getDrugLabel(name: string): Promise<DrugLabel | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const result =
    (await queryOpenFda('openfda.generic_name', key)) ??
    (await queryOpenFda('openfda.brand_name', key));

  const label: DrugLabel | null = result
    ? {
        drug: name,
        boxedWarning: firstSection(result.boxed_warning),
        contraindications: firstSection(result.contraindications),
        warnings: firstSection(result.warnings_and_cautions ?? result.warnings),
        drugInteractions: firstSection(result.drug_interactions),
        dosageAndAdministration: firstSection(result.dosage_and_administration),
      }
    : null;

  cache.set(key, label);
  return label;
}

/** Fetch labels for many drugs in parallel; drugs with no label are skipped. */
export async function getDrugLabels(names: string[]): Promise<DrugLabel[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const labels = await Promise.all(unique.map(getDrugLabel));
  return labels.filter((l): l is DrugLabel => l !== null);
}

/** Render labels as a source block for the Gemini prompt. */
export function formatLabelsForPrompt(labels: DrugLabel[]): string {
  if (labels.length === 0) return 'NO FDA LABELS AVAILABLE.';
  return labels
    .map((l) => {
      const sections = [
        ['BOXED WARNING', l.boxedWarning],
        ['CONTRAINDICATIONS', l.contraindications],
        ['WARNINGS', l.warnings],
        ['DRUG INTERACTIONS', l.drugInteractions],
        ['DOSAGE AND ADMINISTRATION', l.dosageAndAdministration],
      ]
        .filter(([, text]) => text)
        .map(([title, text]) => `## ${title}\n${text}`)
        .join('\n');
      return `=== FDA LABEL: ${l.drug} ===\n${sections}`;
    })
    .join('\n\n');
}

/** True if the quote appears (whitespace/case-insensitively) in that drug's label. */
export function quoteIsInLabel(quote: string, drug: string, labels: DrugLabel[]): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const q = norm(quote);
  if (q.length < 15) return false;
  const label = labels.find((l) => norm(l.drug) === norm(drug)) ?? null;
  const pool = label ? [label] : labels;
  return pool.some((l) => norm(formatLabelsForPrompt([l])).includes(q));
}
