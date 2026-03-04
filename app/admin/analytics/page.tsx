import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import UserAnalyticsClient from "./UserAnalyticsClient";

export default function AdminAnalyticsPage() {
  return (
    <>
      <PageTitle
        title="Trends & User Analytics"
        subtitle="Behavior funnel, search trends & daily activity"
      />
      <UserAnalyticsClient />
    </>
  );
}
