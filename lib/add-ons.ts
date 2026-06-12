/**
 * Add-Ons Module — Fetches available a la carte packages from the platform.
 *
 * Public endpoint, no auth required. Cached for 24 hours.
 * Returns empty array on error (graceful fallback).
 */

import { AddOnsResponseSchema } from "artisan-roast-sdk/alacarte";
import type { AlaCartePackage } from "artisan-roast-sdk/alacarte";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_URL = (
  process.env.PLATFORM_URL || "https://manage.artisanroast.app"
).replace(/\/+$/, "");

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cached: { data: AlaCartePackage[]; expiresAt: number } | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch available a la carte packages from the platform. Cached 24h. */
export async function fetchAddOns(): Promise<AlaCartePackage[]> {
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const response = await fetch(`${PLATFORM_URL}/api/add-ons`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Add-ons fetch failed:", response.status);
      return [];
    }

    const data = AddOnsResponseSchema.parse(await response.json());
    const packages = data.packages;
    cached = { data: packages, expiresAt: Date.now() + CACHE_TTL };
    return packages;
  } catch (error) {
    console.error("Add-ons fetch error:", error);
    return [];
  }
}
