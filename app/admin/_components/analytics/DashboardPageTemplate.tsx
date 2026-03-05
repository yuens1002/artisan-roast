"use client";

import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { DashboardTabNav } from "./DashboardTabNav";

interface DashboardPageTemplateProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardPageTemplate({
  title,
  subtitle,
  children,
}: DashboardPageTemplateProps) {
  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />
      <DashboardTabNav />
      <div className="space-y-4">{children}</div>
    </>
  );
}
