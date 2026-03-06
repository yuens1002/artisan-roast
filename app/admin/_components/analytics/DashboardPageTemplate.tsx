"use client";

import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { DashboardTabNav } from "./DashboardTabNav";

interface DashboardPageTemplateProps {
  title: string;
  subtitle?: string;
  /** Show the Overview / Sales / Analytics tab bar (default: true) */
  showTabs?: boolean;
  children: React.ReactNode;
}

export function DashboardPageTemplate({
  title,
  subtitle,
  showTabs = true,
  children,
}: DashboardPageTemplateProps) {
  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />
      {showTabs && <DashboardTabNav />}
      <div className="space-y-4">{children}</div>
    </>
  );
}
