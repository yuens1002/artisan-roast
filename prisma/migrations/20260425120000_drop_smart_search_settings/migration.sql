-- Smart Search / Counter feature was extracted to a platform plugin.
-- Drop the SiteSettings rows that powered it. Schema unchanged (SiteSettings is generic key-value).
DELETE FROM "SiteSettings"
WHERE "key" IN (
  'ai_voice_persona',
  'ai_voice_examples',
  'ai_voice_surfaces',
  'ai_voice_surface_prompt_hash',
  'ai_smart_search_enabled'
);
