// Word-boundary-aware profanity filter
// Uses \b boundaries to avoid false positives on words like "class", "assess", "scunthorpe"

const PROFANITY_LIST = [
  "fuck",
  "shit",
  "ass(?:hole)?",
  "bitch",
  "damn",
  "cunt",
  "dick",
  "cock",
  "piss",
  "bastard",
  "crap",
  "slut",
  "whore",
];

const profanityRegex = new RegExp(
  `\\b(?:${PROFANITY_LIST.join("|")})\\b`,
  "i"
);

export function containsProfanity(text: string): boolean {
  return profanityRegex.test(text);
}

export function filterProfanity(text: string): {
  clean: boolean;
  flaggedWords: string[];
} {
  const flaggedWords: string[] = [];
  const globalRegex = new RegExp(
    `\\b(${PROFANITY_LIST.join("|")})\\b`,
    "gi"
  );

  let match;
  while ((match = globalRegex.exec(text)) !== null) {
    flaggedWords.push(match[1].toLowerCase());
  }

  return {
    clean: flaggedWords.length === 0,
    flaggedWords: [...new Set(flaggedWords)],
  };
}

/**
 * Censor profanity in text by replacing matched words with first letter + asterisks.
 * e.g., "fuck" → "f***", "shit" → "s***"
 */
export function censorText(text: string): string {
  const globalRegex = new RegExp(
    `\\b(${PROFANITY_LIST.join("|")})\\b`,
    "gi"
  );

  return text.replace(globalRegex, (match) => {
    if (match.length <= 1) return "*";
    return match[0] + "*".repeat(match.length - 1);
  });
}
