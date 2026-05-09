import { validateLicense } from "@/lib/license";
import { fetchResolvedPlans } from "@/lib/plans";
import { PlanPageClient } from "./PlanPageClient";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Dev-only: allow ?licenseKey= override for scenario screenshot testing
  const devKey =
    process.env.NODE_ENV !== "production"
      ? (typeof params.licenseKey === "string" ? params.licenseKey : undefined)
      : undefined;

  const [license, plans] = await Promise.all([
    validateLicense(),
    fetchResolvedPlans(devKey),
  ]);

  return <PlanPageClient license={license} plans={plans} />;
}
