import { revalidateTag } from "next/cache";

/**
 * Invalidate the cached storefront search-drawer config so changes made
 * in the admin reach visitors on their next page load. The storefront
 * layout wraps `getSearchDrawerConfig` in `unstable_cache` tagged with
 * "search-drawer-config" (60s TTL); this fires the tag so the next
 * request rebuilds.
 *
 * Call this from any admin mutation that affects:
 *   - CategoryLabel rows (name, icon, visibility, order, autoOrder)
 *   - CategoryLabelCategory rows (chip ordering / attach / detach)
 *   - Category rows (name change shows up in chip text)
 *
 * Even when the specific mutation does not materially change the
 * rendered search-drawer config, this still marks the tag stale and
 * causes the next request to rebuild the tagged cache. That overhead
 * is typically low because this is intended for low-frequency admin
 * writes, so it remains reasonable to call from every relevant
 * mutation rather than gating on whether the chip-label was touched.
 *
 * Next 16 requires a cacheLife profile; "default" triggers an
 * immediate revalidation on the next request — same call shape used
 * by the admin search-drawer settings route.
 */
export function revalidateSearchDrawer(): void {
  revalidateTag("search-drawer-config", "default");
}
