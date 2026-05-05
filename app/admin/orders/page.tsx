import OrderManagementClient from "./OrderManagementClient";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { IntegrationBanner } from "@/components/shared/IntegrationBanner";
import { getStripeConfigStatus } from "@/lib/payments/credentials";

export default async function AdminOrdersPage() {
  const status = await getStripeConfigStatus();
  const stripeConfigured =
    (status.hasSecretKey && !status.decryptionError) ||
    !!process.env.STRIPE_SECRET_KEY;
  return (
    <>
      <PageTitle
        title="Order Management"
        subtitle="Manage and fulfill customer orders"
      />
      {!stripeConfigured && (
        <div className="mb-4">
          <IntegrationBanner service="Stripe" />
        </div>
      )}
      <OrderManagementClient />
    </>
  );
}
