import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import SubscriptionManagementClient from "./SubscriptionManagementClient";
import { getSubscriptions } from "./actions";
import { isStripeConfigured } from "@/lib/services/stripe";
import { IntegrationBanner } from "@/components/shared/IntegrationBanner";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await getSubscriptions();

  return (
    <>
      <PageTitle
        title="Subscriptions"
        subtitle="Manage customer subscription orders"
      />
      {!(await isStripeConfigured()) && (
        <div className="mb-4">
          <IntegrationBanner service="Stripe" />
        </div>
      )}
      <SubscriptionManagementClient initialSubscriptions={subscriptions} />
    </>
  );
}
