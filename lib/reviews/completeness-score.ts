// Completeness heuristic scoring for brew report reviews
// Score ranges 0-1, with higher scores indicating more detailed reviews

interface CompletenessInput {
  content: string;
  title?: string | null;
  rating: number;
  brewMethod?: string | null;
  tastingNotes?: string[];
  grindSize?: string | null;
  waterTempF?: number | null;
  ratio?: string | null;
}

// Weight distribution (sums to 1.0)
// Each field contributes visibly so the bar responds to every input
const WEIGHTS = {
  content: 0.25,
  brewMethod: 0.15,
  tastingNotes: 0.15,
  grindSize: 0.1,
  waterTempF: 0.1,
  ratio: 0.1,
  title: 0.1,
  rating: 0.05,
};

function contentScore(content: string): number {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) return 0;
  if (wordCount >= 40) return 1;
  // Linear interpolation — a couple of short paragraphs is enough
  return (wordCount - 5) / (40 - 5);
}

export function calculateCompletenessScore(input: CompletenessInput): number {
  let score = 0;

  // Content (0.25) — 40 words is a full score
  score += WEIGHTS.content * contentScore(input.content);

  // Brew method (0.15)
  if (input.brewMethod) {
    score += WEIGHTS.brewMethod;
  }

  // Tasting notes (0.15)
  if (input.tastingNotes && input.tastingNotes.length > 0) {
    score += WEIGHTS.tastingNotes;
  }

  // Each recipe field scores independently (0.10 each)
  if (input.grindSize) {
    score += WEIGHTS.grindSize;
  }
  if (input.waterTempF) {
    score += WEIGHTS.waterTempF;
  }
  if (input.ratio) {
    score += WEIGHTS.ratio;
  }

  // Title (0.10)
  if (input.title && input.title.trim().length > 0) {
    score += WEIGHTS.title;
  }

  // Rating (0.05)
  if (input.rating > 0) {
    score += WEIGHTS.rating;
  }

  return Math.round(score * 100) / 100;
}
