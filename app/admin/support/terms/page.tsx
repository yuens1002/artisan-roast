import { validateLicense, getLicenseKey } from "@/lib/license";
import { fetchPlans } from "@/lib/plans";
import { TermsPageClient } from "./TermsPageClient";
import type { Plan } from "artisan-roast-sdk/plans";

export default async function TermsPage() {
  const [license, plans] = await Promise.all([
    validateLicense(),
    fetchPlans().catch((): Plan[] => []),
  ]);

  const rawKey = await getLicenseKey();

  return (
    <TermsPageClient
      license={license}
      hasKey={!!rawKey}
      rawKey={rawKey}
      plans={plans}
    />
  );
}
