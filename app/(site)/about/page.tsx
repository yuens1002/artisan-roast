import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Store,
  ShoppingBag,
  CreditCard,
  Lock,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  BarChart3,
  Activity,
  Github,
  LayoutDashboard,
  Settings,
  Boxes,
  Truck,
  SquareMenu,
  FileText,
} from "lucide-react";
import { getSiteMetadata } from "@/lib/site-metadata";
import type { Metadata } from "next";
import {
  ScrollReveal,
  AnimatedGradient,
} from "@/app/(site)/_components/content/animated-sections";

export const metadata: Metadata = {
  title: "About the Project",
  description:
    "Artisan Roast is a modern, full-stack e-commerce platform built for specialty coffee retail with AI integration.",
};

export default async function AboutPage() {
  const { storeName } = await getSiteMetadata();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b">
        <AnimatedGradient baseHue={200} spread={60} opacity={45} />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <ScrollReveal>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                About{" "}
{storeName}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:mb-8">
                A modern, full-stack e-commerce experience built for specialty
                coffee retail, demonstrating mastery of modern web development
                and AI integration.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Core Features with Backdrop */}
      <div className="bg-gradient-to-b from-stone-100/70 via-stone-100/40 to-stone-100/20 pb-24 dark:from-stone-800/20 dark:via-stone-800/10 dark:to-stone-800/5" />
      <div className="container mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <ScrollReveal>
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    E-Commerce Essentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Shopping Cart</h3>
                      <p className="text-sm text-muted-foreground">
                        Zustand-powered cart with persistence, supporting
                        one-time purchases and subscriptions.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Stripe Checkout</h3>
                      <p className="text-sm text-muted-foreground">
                        Full payment integration with webhook processing for
                        order fulfillment.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Auth.js with OAuth (GitHub/Google) and database
                        sessions.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Package className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Order Tracking</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete order history with status tracking and
                        customer details.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">
                        Subscription Management
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Recurring orders with Stripe Billing Portal
                        integration.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Search className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Product Search</h3>
                      <p className="text-sm text-muted-foreground">
                        Full-text search with activity tracking across name,
                        description, origin, and tasting notes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Discovery & Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Search className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Keyword Search</h3>
                      <p className="text-sm text-muted-foreground">
                        Faceted search across name, origin, roast level, and
                        tasting notes with an animated slide-out drawer.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Smart Recommendations</h3>
                      <p className="text-sm text-muted-foreground">
                        Behavioral product recommendations based on browsing
                        and purchase history with a smart scoring algorithm.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={0.15} className="md:col-span-2">
              <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Admin Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="flex gap-3">
                    <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Analytics & Insights</h3>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive analytics with trending products, top
                        searches, and conversion metrics.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Activity className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Behavioral Tracking</h3>
                      <p className="text-sm text-muted-foreground">
                        Tracking of page views, product views, searches, and
                        cart actions for both anonymous and authenticated
                        users.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Settings className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Site Customization</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage site settings, content, and configurations
                        directly from the admin panel.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Inventory Management</h3>
                      <p className="text-sm text-muted-foreground">
                        Track stock levels, manage product variants, and
                        update availability in real-time.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Truck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">
                        Order Tracking & Fulfillment
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Process orders, update shipping status, and manage
                        customer fulfillment workflows.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <SquareMenu className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Menu Builder</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage product hierarchy with drag-and-drop,
                        multi-select, bulk operations, and keyboard shortcuts.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Pages CMS</h3>
                      <p className="text-sm text-muted-foreground">
                        AI-powered content management with a 10-question
                        wizard that generates pages in your brand&apos;s
                        voice.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Project Info Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <section className="rounded-lg bg-muted/50 p-8 text-center">
              <h2 className="mb-6 text-2xl font-bold">Project Information</h2>
              <div className="flex flex-col justify-center gap-6 md:flex-row">
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link
                    href="https://github.com/yuens1002/artisan-roast"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-5 w-5" />
                    View on GitHub
                  </Link>
                </Button>
                <Button asChild size="lg" className="gap-2">
                  <Link href="https://demo.artisanroast.app/" target="_blank" rel="noopener noreferrer">
                    <Store className="h-5 w-5" />
                    Try the Demo
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                No signup required — sign in as Admin or Demo Customer to
                explore the full feature set.
              </p>
            </section>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
