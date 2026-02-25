/**
 * Heuristic spam detector for user-submitted reviews.
 * Returns whether the text is likely spam and the reasons why.
 */

interface SpamResult {
  isSpam: boolean;
  reasons: string[];
}

// Thresholds
const ALL_CAPS_RATIO_THRESHOLD = 0.7;
const _REPEATED_CHAR_THRESHOLD = 5;
const URL_COUNT_THRESHOLD = 3;
const MIN_CONTENT_LENGTH = 10;

const URL_REGEX = /https?:\/\/\S+|www\.\S+/gi;
const REPEATED_CHAR_REGEX = /(.)\1{4,}/;
const KEYBOARD_SPAM_REGEX = /(?:asdf|qwer|zxcv|jkl;|uiop){2,}/i;

export function detectSpam(text: string): SpamResult {
  const reasons: string[] = [];

  // Check minimum length
  if (text.trim().length < MIN_CONTENT_LENGTH) {
    reasons.push("Content too short");
  }

  // Check all-caps ratio (ignore short texts)
  if (text.length >= 20) {
    const letters = text.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 0) {
      const upperRatio = letters.replace(/[^A-Z]/g, "").length / letters.length;
      if (upperRatio >= ALL_CAPS_RATIO_THRESHOLD) {
        reasons.push("Excessive capitalization");
      }
    }
  }

  // Check repeated characters (e.g., "aaaaaaa")
  if (REPEATED_CHAR_REGEX.test(text)) {
    reasons.push("Repeated characters");
  }

  // Check excessive URLs
  const urlMatches = text.match(URL_REGEX);
  if (urlMatches && urlMatches.length >= URL_COUNT_THRESHOLD) {
    reasons.push("Excessive URLs");
  }

  // Check keyboard spam
  if (KEYBOARD_SPAM_REGEX.test(text)) {
    reasons.push("Keyboard spam");
  }

  return {
    isSpam: reasons.length > 0,
    reasons,
  };
}
