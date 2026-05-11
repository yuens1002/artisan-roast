import { validateLicense } from "@/lib/license";
import { fetchResolvedPlans } from "@/lib/plans";
import { PlanPageClient } from "./PlanPageClient";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isDev = process.env.NODE_ENV !== "production";

  // Dev-only: ?scenario=<key> bypasses the provider entirely and renders from
  // the local SDK-derived fixture. Fixture lives in _fixtures/ (underscore
  // prefix marks it as a non-routable feature-private dir) so the Vercel
  // build doesn't exclude it the way it does __tests__/.
  const scenarioKey = isDev && typeof params.scenario === "string" ? params.scenario : undefined;
  if (scenarioKey) {
    const { SCENARIO_FIXTURES } = await import("./_fixtures/plan-scenarios");
    const license = await validateLicense();
    const plans = (SCENARIO_FIXTURES as Record<string, typeof SCENARIO_FIXTURES["dev-free"]>)[scenarioKey] ?? [];
    return <PlanPageClient license={license} plans={plans} />;
  }

  // Dev-only: ?licenseKey= override forwards to the live platform resolver.
  const devKey =
    isDev && typeof params.licenseKey === "string" ? params.licenseKey : undefined;

  const [license, plans] = await Promise.all([
    validateLicense(),
    fetchResolvedPlans(devKey),
  ]);

  return <PlanPageClient license={license} plans={plans} />;
}
