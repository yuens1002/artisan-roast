import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteMetadata } from "@/lib/site-metadata";
import { getWeightUnit } from "@/lib/config/app-settings";
import { ADMIN_PAGES } from "@/lib/config/admin-pages";
import SalesClient from "./SalesClient";

export async function generateMetadata() {
  const { storeName } = await getSiteMetadata();
  return {
    title: `${ADMIN_PAGES.sales.label} | ${storeName}`,
    description: ADMIN_PAGES.sales.description,
  };
}

export default async function SalesPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin?callbackUrl=/admin/sales");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/");
  }

  const weightUnit = await getWeightUnit();

  return <SalesClient weightUnit={weightUnit} />;
}
