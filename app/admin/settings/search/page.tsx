import { prisma } from "@/lib/prisma";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { SearchSettingsForm } from "./_components/SearchSettingsForm";

const KEY_CHIP_LABEL = "search_drawer_chip_label";
const KEY_CURATED_CATEGORY = "search_drawer_curated_category";

interface InitialSettings {
  chipLabelId: string | null;
  curatedCategorySlug: string | null;
}

async function getInitialSettings(): Promise<InitialSettings> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: [KEY_CHIP_LABEL, KEY_CURATED_CATEGORY] } },
    select: { key: true, value: true },
  });
  const map = rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  return {
    chipLabelId: map[KEY_CHIP_LABEL] || null,
    curatedCategorySlug:
      KEY_CURATED_CATEGORY in map ? map[KEY_CURATED_CATEGORY] : null,
  };
}

async function getLabelOptions() {
  return prisma.categoryLabel.findMany({
    select: {
      id: true,
      name: true,
      isVisible: true,
      categories: {
        orderBy: { order: "asc" },
        select: { category: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { order: "asc" },
  });
}

async function getCategoryOptions() {
  return prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { order: "asc" },
  });
}

export default async function SearchSettingsPage() {
  const [settings, labels, categories] = await Promise.all([
    getInitialSettings(),
    getLabelOptions(),
    getCategoryOptions(),
  ]);

  // Defaults: 1st label by order, 1st category by order. The form treats null
  // as "use the default" and shows that default selected from the start.
  const defaultLabelId = labels[0]?.id ?? null;
  const defaultCategorySlug = categories[0]?.slug ?? null;

  return (
    <div className="space-y-8">
      <PageTitle
        title="Search Settings"
        subtitle="Configure the search drawer's discovery surface — chip row and curated products section."
      />

      <SearchSettingsForm
        initialSettings={settings}
        labels={labels}
        categories={categories}
        defaultLabelId={defaultLabelId}
        defaultCategorySlug={defaultCategorySlug}
      />
    </div>
  );
}
