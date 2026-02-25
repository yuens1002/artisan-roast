import { requireAdmin } from "@/lib/admin";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import ReviewModerationClient from "./ReviewModerationClient";

export default async function AdminReviewsPage() {
  await requireAdmin();

  return (
    <>
      <PageTitle
        title="Review Moderation"
        subtitle="Manage and moderate customer reviews"
      />
      <ReviewModerationClient />
    </>
  );
}
