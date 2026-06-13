import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Coffee,
  Search,
  CreditCard,
  LayoutDashboard,
  FileText,
  Shield,
  Code,
  Rocket,
  Layers,
  Check,
  X,
  Github,
} from "lucide-react";
import type { Metadata } from "next";
import {
  ScrollReveal,
  AnimatedGradient,
} from "@/app/(site)/_components/content/animated-sections";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Built for specialty coffee, powered by modern tech. Compare Artisan Roast with Shopify, Medusa, and other e-commerce platforms.",
};

const features = [
  {
    icon: Coffee,
    title: "Zero-Configuration Coffee Data",
    description:
      "Stop hacking generic e-commerce to fit specialty coffee. Roast level, origin, altitude, tasting notes \u2014 they\u2019re schema columns, not custom fields you bolt on later.",
    accent:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    icon: Search,
    title: "Smart Search & Discovery",
    description:
      "Faceted keyword search across name, origin, roast level, and tasting notes — with an animated slide-out drawer and curated category chips.",
    accent:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    icon: CreditCard,
    title: "Built-in Payments & Subscriptions",
    description:
      "Checkout, subscriptions, billing portal \u2014 all included. No third-party apps eating into your margins or complicating your stack.",
    accent:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    icon: LayoutDashboard,
    title: "Admin Dashboard",
    description:
      "Analytics, inventory, orders, menu builder with coffee-specific filters.",
    accent:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    icon: FileText,
    title: "Pages CMS",
    description: "AI wizard generates pages in your brand\u2019s voice.",
    accent:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
  {
    icon: Shield,
    title: "Auth & Security",
    description: "OAuth (GitHub/Google), role-based admin access.",
    accent:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  {
    icon: Layers,
    title: "Provider-Agnostic Plans",
    description:
      "Plans, trials, and add-ons follow an open SDK contract. Any developer can build a managed hosting platform — the store is a pure consumer, not locked to any provider.",
    accent:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  {
    icon: Code,
    title: "Modern Stack, No Headless Complexity",
    description:
      "The performance and SEO of a custom Next.js storefront with the simplicity of a monolithic platform. TypeScript end-to-end, one codebase.",
    accent:
      "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  },
  {
    icon: Rocket,
    title: "Code to Cup in One Click",
    description:
      "Vercel + Neon PostgreSQL. No Docker, no DevOps, no infrastructure team. Deploy and start selling.",
    accent:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
];

type CellValue = true | false | string;

const comparisonRows: {
  feature: string;
  artisan: CellValue;
  shopify: CellValue;
  medusa: CellValue;
  saleor: CellValue;
  nextCommerce: CellValue;
}[] = [
  {
    feature: "Coffee-native schema",
    artisan: "Origin, roast, altitude, tasting notes",
    shopify: "Custom metafields",
    medusa: "Custom attributes",
    saleor: "Custom attributes",
    nextCommerce: false,
  },
  {
    feature: "Monthly cost",
    artisan: "Free",
    shopify: "$39\u2013399/mo",
    medusa: "Free",
    saleor: "Free",
    nextCommerce: "Free",
  },
  {
    feature: "Transaction fees",
    artisan: "Stripe only",
    shopify: "+0.5\u20132% platform fee",
    medusa: "Stripe only",
    saleor: "Stripe only",
    nextCommerce: "Stripe only",
  },
  {
    feature: "Storefront included",
    artisan: true,
    shopify: true,
    medusa: false,
    saleor: false,
    nextCommerce: "Basic",
  },
  {
    feature: "Admin dashboard",
    artisan: true,
    shopify: true,
    medusa: true,
    saleor: true,
    nextCommerce: false,
  },
  {
    feature: "AI content generation",
    artisan: "Built-in (Pages CMS)",
    shopify: "Paid apps",
    medusa: false,
    saleor: false,
    nextCommerce: false,
  },
  {
    feature: "Subscriptions",
    artisan: "Built-in",
    shopify: "Paid apps",
    medusa: "Plugin",
    saleor: false,
    nextCommerce: false,
  },
  {
    feature: "Self-hostable",
    artisan: true,
    shopify: false,
    medusa: true,
    saleor: true,
    nextCommerce: true,
  },
  {
    feature: "Single codebase",
    artisan: true,
    shopify: "N/A",
    medusa: false,
    saleor: false,
    nextCommerce: true,
  },
  {
    feature: "TypeScript end-to-end",
    artisan: true,
    shopify: "Liquid",
    medusa: true,
    saleor: "Python + GraphQL",
    nextCommerce: true,
  },
  {
    feature: "Deploy complexity",
    artisan: "One-click",
    shopify: "Managed",
    medusa: "Docker",
    saleor: "Docker",
    nextCommerce: "One-click",
  },
];

const techStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Prisma",
  "Stripe",
  "PostgreSQL",
  "Vercel",
];

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-600 dark:text-green-400" />;
  }
  if (value === false) {
    return <X className="h-5 w-5 text-red-400/60 dark:text-red-500/40" />;
  }
  return <span className="text-sm">{value}</span>;
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b">
        <AnimatedGradient baseHue={30} spread={45} opacity={50} />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <ScrollReveal>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Built for Specialty Coffee.
                <br />
                Powered by Modern Tech.
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                The only open-source e-commerce platform with coffee in its DNA.
                Origin, roast level, tasting notes are schema columns, not
                afterthoughts.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/admin">Try Admin Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link
                    href="https://github.com/yuens1002/artisan-roast"
                    target="_blank"
                  >
                    <Github className="h-5 w-5" />
                    View on GitHub
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Feature Grid with Backdrop */}
      <div className="bg-gradient-to-b from-muted/60 via-muted/40 to-muted/20 pb-24 dark:from-muted/30 dark:via-muted/15 dark:to-muted/10" />
      <div className="container mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description, accent }, index) => (
              <ScrollReveal key={title} delay={index * 0.08}>
                <div className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <ScrollReveal>
              <h2 className="mb-3 text-center text-3xl font-bold">
                Platform Comparison
              </h2>
              <p className="mb-8 text-center text-muted-foreground">
                No platform fees, no app tax. Reinvest your margins into
                sourcing better beans, not paying for features that should be
                included.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Feature</TableHead>
                    <TableHead className="min-w-[120px] bg-amber-50/80 font-bold text-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
                      Artisan Roast
                    </TableHead>
                    <TableHead className="min-w-[120px]">Shopify</TableHead>
                    <TableHead className="min-w-[120px]">Medusa</TableHead>
                    <TableHead className="min-w-[120px]">Saleor</TableHead>
                    <TableHead className="min-w-[120px]">
                      Next.js Commerce
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">
                        {row.feature}
                      </TableCell>
                      <TableCell className="bg-amber-50/50 dark:bg-amber-900/10">
                        <ComparisonCell value={row.artisan} />
                      </TableCell>
                      <TableCell>
                        <ComparisonCell value={row.shopify} />
                      </TableCell>
                      <TableCell>
                        <ComparisonCell value={row.medusa} />
                      </TableCell>
                      <TableCell>
                        <ComparisonCell value={row.saleor} />
                      </TableCell>
                      <TableCell>
                        <ComparisonCell value={row.nextCommerce} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Tech Stack Strip */}
      <div className="border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <ScrollReveal>
              <h2 className="mb-6 text-center text-xl font-semibold text-muted-foreground">
                Built With
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="container mx-auto px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <section className="rounded-lg bg-muted/50 p-8 text-center">
              <h2 className="mb-4 text-2xl font-bold">
                Ready to get started?
              </h2>
              <p className="mb-6 text-muted-foreground">
                Try the live demo or explore the source code on GitHub.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/admin">Try Admin Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link
                    href="https://github.com/yuens1002/artisan-roast"
                    target="_blank"
                  >
                    <Github className="h-5 w-5" />
                    View on GitHub
                  </Link>
                </Button>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
