import { prisma } from "@/lib/prisma";

const STOP_WORDS = new Set([
  "what",
  "whats",
  "is",
  "are",
  "good",
  "best",
  "great",
  "any",
  "with",
  "for",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "of",
  "me",
  "my",
  "some",
  "something",
  "anything",
  "that",
  "this",
  "which",
  "can",
  "i",
  "you",
  "us",
  "we",
  "do",
  "does",
  "would",
  "like",
  "looking",
  "find",
  "help",
  "need",
  "want",
  "show",
  "get",
  "give",
  "have",
  "over",
  "up",
  "out",
  "about",
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export async function fullTextSearchIds(
  query: string,
  limit = 50
): Promise<string[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const tsquery = tokens.join(" | ");

  const results = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM (
      SELECT
        id,
        to_tsvector('english',
          coalesce("name", '') || ' ' ||
          coalesce("description", '') || ' ' ||
          array_to_string("tastingNotes", ' ') || ' ' ||
          array_to_string("origin", ' ') || ' ' ||
          coalesce("processing", '') || ' ' ||
          coalesce("variety", '')
        ) AS search_vector,
        to_tsquery('english', ${tsquery}) AS search_query
      FROM "Product"
      WHERE "isDisabled" = false
    ) AS p
    WHERE p.search_vector @@ p.search_query
    ORDER BY ts_rank(p.search_vector, p.search_query) DESC
    LIMIT ${limit}
  `;

  return results.map((r) => r.id);
}
