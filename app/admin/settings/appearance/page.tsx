"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Moon, Palette, Sun, Terminal } from "lucide-react";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { SettingsSection } from "@/app/admin/_components/forms/SettingsSection";
import { SaveButton } from "@/app/admin/_components/forms/SaveButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  destructive: string;
}

interface ThemeFonts {
  sans: string;
  serif: string;
  mono: string;
  googleFontsUrl: string;
}

interface ThemeEntry {
  id: string;
  name: string;
  source: string;
  fonts?: ThemeFonts;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

interface Manifest {
  themes: ThemeEntry[];
}

/** Built-in default theme swatches (from globals.css neutral palette) */
const DEFAULT_COLORS: ThemeEntry["colors"] = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    secondary: "oklch(0.97 0 0)",
    accent: "oklch(0.97 0 0)",
    muted: "oklch(0.97 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    secondary: "oklch(0.269 0 0)",
    accent: "oklch(0.269 0 0)",
    muted: "oklch(0.269 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
  },
};

const SWATCH_KEYS: (keyof ThemeColors)[] = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
];

/** Preview CSS variables to apply inline for the live preview panel */
const PREVIEW_VARS: (keyof ThemeColors)[] = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
];

export default function AppearanceSettingsPage() {
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const isDark = resolvedTheme === "dark";

  const [themes, setThemes] = useState<ThemeEntry[]>([]);
  const [savedTheme, setSavedTheme] = useState<string>("default");
  const [selectedTheme, setSelectedTheme] = useState<string>("default");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDark, setPreviewDark] = useState(isDark);

  // Sync preview mode when admin theme changes
  useEffect(() => setPreviewDark(isDark), [isDark]);

  // Fetch manifest and current theme on mount
  useEffect(() => {
    async function load() {
      try {
        const [manifestRes, settingRes] = await Promise.all([
          fetch("/themes/manifest.json"),
          fetch("/api/admin/settings/theme"),
        ]);
        if (manifestRes.ok) {
          const manifest: Manifest = await manifestRes.json();
          setThemes(manifest.themes);
        }
        if (settingRes.ok) {
          const data = await settingRes.json();
          const current = data.theme || "default";
          setSavedTheme(current);
          setSelectedTheme(current);
        }
      } catch {
        // Silently fail — defaults are fine
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const isDirty = selectedTheme !== savedTheme;

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: selectedTheme === "default" ? null : selectedTheme,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedTheme(selectedTheme);
      toast({ title: "Theme saved", description: "Storefront theme updated." });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedTheme, toast]);

  // Dynamically load Google Fonts for the selected theme's preview
  useEffect(() => {
    const selectedEntry = themes.find((t) => t.id === selectedTheme);
    const fontsUrl = selectedEntry?.fonts?.googleFontsUrl;
    if (!fontsUrl) return;

    const linkId = "theme-preview-fonts";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = fontsUrl;

    return () => {
      // Cleanup on unmount
      link?.remove();
    };
  }, [selectedTheme, themes]);

  // Build the list with "Default" always first
  const allThemes: {
    id: string;
    name: string;
    fonts?: ThemeFonts;
    colors: ThemeEntry["colors"];
  }[] = [
    { id: "default", name: "Default", colors: DEFAULT_COLORS },
    ...themes,
  ];

  // Get the selected theme's data for the preview panel
  const previewEntry = allThemes.find((t) => t.id === selectedTheme);
  const previewColors = previewEntry
    ? previewDark
      ? previewEntry.colors.dark
      : previewEntry.colors.light
    : previewDark
      ? DEFAULT_COLORS.dark
      : DEFAULT_COLORS.light;

  // Build inline style for preview container
  const previewStyle: Record<string, string> = {};
  for (const key of PREVIEW_VARS) {
    previewStyle[`--${key}`] = previewColors[key];
  }
  // Also set foreground variants for the preview
  previewStyle["--primary-foreground"] = previewColors.background;
  previewStyle["--muted-foreground"] = previewColors.foreground;
  previewStyle["--card"] = previewColors.background;
  previewStyle["--card-foreground"] = previewColors.foreground;
  previewStyle["--border"] = previewDark
    ? "oklch(1 0 0 / 10%)"
    : previewColors.muted;
  // Apply theme font to the preview
  if (previewEntry?.fonts) {
    previewStyle["fontFamily"] = previewEntry.fonts.sans;
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Appearance"
        subtitle="Customize your storefront's look and feel"
      />

      <SettingsSection
        icon={<Palette className="h-5 w-5" />}
        title="Storefront Theme"
        description="Choose a color theme for your customer-facing storefront. Admin pages always use the default neutral theme."
        action={
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Unsaved changes
              </span>
            )}
            <SaveButton
              onClick={handleSave}
              isSaving={isSaving}
              disabled={!isDirty}
            />
          </div>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Theme card grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allThemes.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                const colors = isDark
                  ? theme.colors.dark
                  : theme.colors.light;
                // Extract primary font name (e.g., "'Outfit', sans-serif" → "Outfit")
                const fontLabel = theme.fonts
                  ? theme.fonts.sans.split(",")[0].replace(/'/g, "").trim()
                  : "Inter";

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      "relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-colors",
                      "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <span className="text-sm font-semibold">{theme.name}</span>
                    <div className="flex gap-1.5">
                      {SWATCH_KEYS.map((key) => (
                        <div
                          key={key}
                          className="h-5 w-5 rounded-full border border-border/50"
                          style={{ backgroundColor: colors[key] }}
                          title={key}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {fontLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live preview panel */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Preview</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPreviewDark(!previewDark)}
                  aria-label={previewDark ? "Preview light mode" : "Preview dark mode"}
                >
                  {previewDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>
              <Card
                className="overflow-hidden p-6"
                style={previewStyle as React.CSSProperties}
              >
                <div className="space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <h3
                      className="text-lg font-bold"
                      style={{ color: "var(--foreground)" }}
                    >
                      Ethiopian Yirgacheffe
                    </h3>
                    <Badge
                      style={{
                        backgroundColor: "var(--secondary)",
                        color: "var(--foreground)",
                      }}
                    >
                      New Arrival
                    </Badge>
                  </div>

                  {/* Description */}
                  <p
                    className="text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    A bright and floral single-origin coffee with notes of
                    jasmine, bergamot, and stone fruit.
                  </p>

                  {/* Price + buttons row */}
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xl font-bold"
                      style={{ color: "var(--foreground)" }}
                    >
                      $18.50
                    </span>
                    <button
                      type="button"
                      className="rounded-md px-4 py-2 text-sm font-medium"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-4 py-2 text-sm font-medium border"
                      style={{
                        backgroundColor: "var(--destructive)",
                        color: "var(--primary-foreground)",
                        borderColor: "var(--destructive)",
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {/* Accent/muted area */}
                  <div
                    className="rounded-md p-3"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      Free shipping on orders over $50
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Self-service info note */}
            <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/50 px-4 py-3 mt-4">
              <Terminal className="h-4 w-4 mt-0.5 text-foreground/70 shrink-0" />
              <p className="text-sm text-foreground/70">
                Want more themes? Run{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                  npm run theme:add -- --name &lt;name&gt; --url &lt;url&gt;
                </code>{" "}
                to install any theme from tweakcn.com, Shadcn Studio, or other
                shadcn-compatible registries.
              </p>
            </div>
          </>
        )}
      </SettingsSection>
    </div>
  );
}
