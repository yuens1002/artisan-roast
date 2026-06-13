import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, FileText, Sparkles, Layout } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Features - Pages CMS",
  description:
    "Explore the new Pages CMS feature for managing informational content with AI-powered generation.",
};

async function getCMSPages() {
  const pages = await prisma.page.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      metaDescription: true,
      generatedBy: true,
      isPublished: true,
      publishedAt: true,
      children: {
        where: { isPublished: true },
        select: { id: true, title: true, slug: true },
      },
    },
  });

  return pages;
}

export default async function AppFeaturesPage() {
  const pages = await getCMSPages();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-2xl font-bold md:text-4xl">
              Pages CMS Feature
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              A comprehensive content management system for informational pages
              with AI-powered content generation
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/pages/about"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileText className="h-5 w-5" />
                View Example Page
              </Link>
              <Link
                href="/admin/pages"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-semibold transition-colors hover:bg-muted"
              >
                <Layout className="h-5 w-5" />
                Manage Pages (Admin)
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-3xl font-bold text-center">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Rich Content Pages</h3>
              <p className="text-muted-foreground">
                Create and manage informational pages with rich text content,
                hero images, and hierarchical organization.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                AI-Powered Generation
              </h3>
              <p className="text-muted-foreground">
                Generate compelling About pages using our 10-question AI wizard
                that creates content in your brand&apos;s voice.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Layout className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                Hierarchical Structure
              </h3>
              <p className="text-muted-foreground">
                Organize pages in parent-child relationships for better content
                organization and navigation.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                Publishing Workflow
              </h3>
              <p className="text-muted-foreground">
                Draft and publish pages with full control over visibility and
                footer navigation integration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Pages */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-3xl font-bold text-center">Published Pages</h2>
            {pages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  No published pages yet. Create your first page in the admin
                  panel.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {pages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/pages/${page.slug}`}
                    className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-xl font-semibold group-hover:text-primary">
                        {page.title}
                      </h3>
                      {page.generatedBy === "ai" && (
                        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </div>
                      )}
                    </div>
                    {page.metaDescription && (
                      <p className="mb-3 text-sm text-muted-foreground">
                        {page.metaDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>/{page.slug}</span>
                      {page.children.length > 0 && (
                        <span>{page.children.length} child pages</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Architecture Documentation */}
      <div className="border-t">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-3xl font-bold text-center">Documentation</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold">Architecture</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Learn about the CMS architecture and design decisions.
                </p>
                <Link
                  href="https://github.com/yuens1002/artisan-roast/blob/main/docs/pages-cms-architecture.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Documentation →
                </Link>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold">AI Wizard</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Explore the AI-powered About page generator specification.
                </p>
                <Link
                  href="https://github.com/yuens1002/artisan-roast/blob/main/docs/ai-about-page-generator.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Documentation →
                </Link>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-2 font-semibold">Implementation</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Review the complete implementation plan and checklist.
                </p>
                <Link
                  href="https://github.com/yuens1002/artisan-roast/blob/main/docs/pages-cms-implementation-plan.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Documentation →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
