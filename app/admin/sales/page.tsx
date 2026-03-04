import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteMetadata } from "@/lib/site-metadata";
import SalesClient from "./SalesClient";

export async function generateMetadata() {
  const { storeName } = await getSiteMetadata();
  return {
    title: `Sales Analytics | ${storeName}`,
    description: "Revenue, products, and order analytics",
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

  return <SalesClient />;
}
